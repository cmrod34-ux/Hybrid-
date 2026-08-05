import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser, rateLimitWindow, capString } from "@/lib/verifyUser";
import { verifiedEntitlements } from "@/lib/subscription";
import {
  CUSTOM_PLAN_PRODUCT,
  COACHING_ENTITLEMENT,
  decideFulfillment,
  executeFulfillment,
  fetchRevokedTxns,
  pickCustomPlanTransaction,
  type ExistingRequest,
  type RcOneTimePurchase,
  type ServiceType,
} from "@/lib/coachFulfillment";

// Server-side creation of PAID coaching requests — the only path to an
// 'assessment_needed' row (the database refuses client inserts of paid
// states; clients may only self-create waitlist rows).
//
// Payment is verified with RevenueCat's REST API (secret key) BEFORE any
// write, and fulfillment is transaction-exact:
//   - custom_plan → the newest UNUSED, UNREVOKED one-time purchase of
//     hybrid_custom_plan; its transaction id is stamped onto the request and
//     a UNIQUE index guarantees one-request-per-transaction, forever.
//   - coaching   → an ACTIVE "coaching" entitlement; one open coaching
//     request per subscriber.
// Replays return the SAME request; a same-service waitlist row is atomically
// promoted; an open paid request for the other service is a 409; revoked
// (refunded) transactions never fulfill. The webhook fulfills the same way
// when the app dies right after the purchase sheet.

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

  const isPrivileged = auth.role === "developer" || auth.role === "admin";

  try {
    return await withUserLock(userId, async () => {
      // The athlete's full request history (any status) — reuse/idempotency
      // and conflict decisions need completed rows too.
      const { data: reqRows, error: reqErr } = await admin
        .from("coach_requests")
        .select("id, service, status, purchase_transaction_id, user_id")
        .eq("user_id", userId);
      if (reqErr) return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: CORS });
      const requests = (reqRows ?? []) as ExistingRequest[];

      let txnId: string | null = null;
      let purchasedAt: string | null = null;
      let allConsumed = false;
      let hasCoaching = false;

      if (isPrivileged) {
        // Developer/admin test mode: payment bypassed. Custom-plan rows get a
        // synthetic transaction id so the uniqueness machinery still runs;
        // an existing open request is still reused, never duplicated.
        hasCoaching = true;
        if (svc === "custom_plan") {
          txnId = `dev-${userId}-${Date.now()}`;
          purchasedAt = new Date().toISOString();
        }
      } else if (svc === "coaching") {
        const ents = await verifiedEntitlements(userId);
        if (ents.status !== "ok") {
          return NextResponse.json(
            { error: "Payment verification is unavailable right now — try again shortly. You have not been charged twice." },
            { status: 503, headers: CORS },
          );
        }
        hasCoaching = ents.active.has(COACHING_ENTITLEMENT);
      } else {
        const rc = await fetchCustomPlanPurchases(userId);
        if (!rc.ok) {
          return NextResponse.json(
            { error: "Payment verification is unavailable right now — try again shortly. You have not been charged twice." },
            { status: 503, headers: CORS },
          );
        }
        const revoked = await fetchRevokedTxns(admin, userId);
        // "Used" means attached to ANY request in the system. Same-user rows
        // are in `requests`; cross-user reuse is caught by the unique index.
        const used = new Set(requests.map((r) => r.purchase_transaction_id).filter((t): t is string => !!t));
        const pick = pickCustomPlanTransaction({ purchases: rc.purchases, revokedTxnIds: revoked, usedTxnIds: used });
        txnId = pick.txn?.id ?? null;
        purchasedAt = pick.txn?.purchase_date ?? null;
        allConsumed = pick.txn === null && pick.hadPurchase;
      }

      const decision = decideFulfillment({
        service: svc,
        requests,
        txnId,
        hasCoachingEntitlement: hasCoaching,
        allTransactionsConsumed: allConsumed,
      });
      const outcome = await executeFulfillment(admin, {
        userId,
        athleteName,
        service: svc,
        decision,
        txnId,
        productId: txnId ? (isPrivileged ? "dev" : CUSTOM_PLAN_PRODUCT) : null,
        purchasedAt,
      });

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
