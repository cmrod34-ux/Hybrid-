import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser, rateLimitWindow } from "@/lib/verifyUser";

// Server-trusted first-free-plan record.
//
// The record lives in Supabase auth `app_metadata.hybrid_first_plan`, which
// only the service-role key can write — supabase-js updateUser on the client
// cannot touch app_metadata. That makes it the durable truth for "has this
// account already received its first free plan": reinstalling the app or
// clearing device storage cannot mint a second one.
//
// Rules enforced HERE (never trusted from the client):
//  - First write for an account is accepted as-is (status active).
//  - While active, a replacement is accepted only within the grace window and
//    up to the configured replacement count; it restarts the window.
//  - Once a record exists and is past its window (or replacements are spent),
//    further writes only ever move the status forward (active → completed);
//    nothing the client sends can reset or erase the record.
//
// Unconfigured (no SUPABASE_SERVICE_ROLE_KEY): 503 — the app degrades to its
// local record, the same pattern as the RevenueCat integration.

const GRACE_DAYS = 7;
const GRACE_REPLACEMENTS = 1;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface FirstPlanRecord {
  status: "active" | "completed" | "expired" | "replaced";
  planId: string;
  startedAt: string;
  endsAt: string;
  replacementsUsed: number;
}

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parseRecord(raw: unknown): FirstPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.planId !== "string" || typeof r.endsAt !== "string" || typeof r.startedAt !== "string") return null;
  const status = r.status;
  if (status !== "active" && status !== "completed" && status !== "expired" && status !== "replaced") return null;
  return {
    status,
    planId: r.planId.slice(0, 64),
    startedAt: r.startedAt.slice(0, 32),
    endsAt: r.endsAt.slice(0, 10),
    replacementsUsed: typeof r.replacementsUsed === "number" ? Math.max(0, Math.min(99, r.replacementsUsed)) : 0,
  };
}

/** Freshen a stored record's status against today (active → completed). */
function derive(record: FirstPlanRecord): FirstPlanRecord {
  if (record.status !== "active") return record;
  const today = new Date().toISOString().slice(0, 10);
  return today >= record.endsAt ? { ...record, status: "completed" } : record;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok || !auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  if (!rateLimitWindow(`firstplan:get:${auth.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ configured: false, record: null }, { status: 503, headers: CORS });

  try {
    const { data, error } = await admin.auth.admin.getUserById(auth.userId);
    if (error || !data.user) return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: CORS });
    const record = parseRecord((data.user.app_metadata as Record<string, unknown> | undefined)?.hybrid_first_plan);
    return NextResponse.json({ configured: true, record: record ? derive(record) : null }, { headers: CORS });
  } catch (e) {
    console.error("[first-plan] GET error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}

export async function POST(req: Request) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok || !auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  if (!rateLimitWindow(`firstplan:post:${auth.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ configured: false }, { status: 503, headers: CORS });

  let incoming: FirstPlanRecord | null = null;
  try {
    const body = (await req.json()) as { record?: unknown };
    incoming = parseRecord(body.record);
  } catch {
    incoming = null;
  }
  if (!incoming) return NextResponse.json({ error: "Invalid record" }, { status: 400, headers: CORS });

  try {
    const { data, error } = await admin.auth.admin.getUserById(auth.userId);
    if (error || !data.user) return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: CORS });
    const existing = parseRecord((data.user.app_metadata as Record<string, unknown> | undefined)?.hybrid_first_plan);

    let next: FirstPlanRecord;
    if (!existing) {
      // First record for this account — accept, always starting active with
      // zero replacements regardless of what the client claims.
      next = { ...incoming, status: "active", replacementsUsed: 0 };
    } else {
      const current = derive(existing);
      const withinGrace =
        Date.now() <= Date.parse(current.startedAt) + GRACE_DAYS * 86_400_000 &&
        current.replacementsUsed < GRACE_REPLACEMENTS;
      if (current.status === "active" && current.planId !== incoming.planId && withinGrace) {
        // Grace replacement: new plan restarts the window, consumes one slot.
        next = { ...incoming, status: "active", replacementsUsed: current.replacementsUsed + 1 };
      } else {
        // Everything else: the stored record stands (status may have derived
        // forward to completed). The client can never reset the offer.
        next = current;
      }
    }

    if (JSON.stringify(next) !== JSON.stringify(existing)) {
      const { error: updErr } = await admin.auth.admin.updateUserById(auth.userId, {
        app_metadata: { ...data.user.app_metadata, hybrid_first_plan: next },
      });
      if (updErr) {
        console.error("[first-plan] update failed:", updErr.message);
        return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
      }
    }
    return NextResponse.json({ configured: true, record: next }, { headers: CORS });
  } catch (e) {
    console.error("[first-plan] POST error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
