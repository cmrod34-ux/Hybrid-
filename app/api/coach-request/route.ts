import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser, rateLimitWindow, capString } from "@/lib/verifyUser";
import { verifiedEntitlements } from "@/lib/subscription";
import {
  CUSTOM_PLAN_PRODUCT,
  COACHING_ENTITLEMENT,
  processCoachRequest,
  type RcOneTimePurchase,
  type ServiceType,
} from "@/lib/coachFulfillment";

// Server-side creation of PAID coaching requests — the only path to an
// 'assessment_needed' row (the database refuses client inserts of paid
// states; clients may only self-create waitlist rows).
//
// The full flow lives in lib/coachFulfillment.processCoachRequest (shared
// with the webhook's fulfillment safety net and exercised end-to-end by the
// test suite): newest verified non-refunded transaction first — if it
// already backs one of THIS user's requests (the webhook fulfilled before
// the app's call landed), that exact request returns with 200. The client
// is never the payment authority and never supplies a transaction id.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Serialize per user within this instance (the txn unique index remains the
// cross-instance arbiter).
const userLocks = new Map<string, Promise<void>>();
function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userLocks.get(userId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail: Promise<void> = run.then(
    () => undefined,
    () => undefined,
  ).then(() => {
    if (userLocks.get(userId) === tail) userLocks.delete(userId);
  });
  userLocks.set(userId, tail);
  return run;
}

/** RevenueCat one-time purchases of the custom-plan product for a user. */
async function fetchCustomPlanPurchases(userId: string): Promise<{ ok: boolean; purchases: RcOneTimePurchase[] }> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return { ok: false, purchases: [] };
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, purchases: [] };
    const data = (await res.json()) as {
      subscriber?: { non_subscriptions?: Record<string, { id?: string; purchase_date?: string }[]> };
    };
    const raw = data.subscriber?.non_subscriptions?.[CUSTOM_PLAN_PRODUCT] ?? [];
    const purchases = raw
      .filter((p) => typeof p.id === "string" && p.id.length > 0)
      .map((p) => ({ id: p.id as string, purchase_date: p.purchase_date ?? new Date(0).toISOString() }));
    return { ok: true, purchases };
  } catch {
    return { ok: false, purchases: [] };
  }
}

async function fetchCoachingActive(userId: string): Promise<{ ok: boolean; active: boolean }> {
  const ents = await verifiedEntitlements(userId);
  if (ents.status !== "ok") return { ok: false, active: false };
  return { ok: true, active: ents.active.has(COACHING_ENTITLEMENT) };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok || !auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  const userId = auth.userId;
  if (!rateLimitWindow(`coachreq:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ configured: false }, { status: 503, headers: CORS });

  let service: ServiceType | null = null;
  let athleteName = "";
  try {
    const body = (await req.json()) as { service?: unknown; athleteName?: unknown };
    service = body.service === "coaching" || body.service === "custom_plan" ? body.service : null;
    athleteName = capString(body.athleteName, 80) || "Athlete";
  } catch {
    service = null;
  }
  if (!service) return NextResponse.json({ error: "Invalid service" }, { status: 400, headers: CORS });
  const svc = service;

  try {
    return await withUserLock(userId, async () => {
      const outcome = await processCoachRequest(
        admin,
        { userId, athleteName, service: svc, isPrivileged: auth.role === "developer" || auth.role === "admin" },
        { fetchCustomPlanPurchases, fetchCoachingActive },
      );
      if (outcome.httpStatus === 200) {
        return NextResponse.json({ ok: true, request: outcome.request, existing: outcome.existing ?? false }, { headers: CORS });
      }
      return NextResponse.json({ error: outcome.error ?? "Server error" }, { status: outcome.httpStatus, headers: CORS });
    });
  } catch (e) {
    console.error("[coach-request] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
