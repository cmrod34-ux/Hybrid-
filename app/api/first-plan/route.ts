import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser, rateLimitWindow } from "@/lib/verifyUser";
import {
  applyPlanEvent,
  deriveStatus,
  parsePlanEvent,
  parseStoredRecord,
} from "@/lib/firstPlanServer";

// Server-trusted first-free-plan record.
//
// The record lives in Supabase auth `app_metadata.hybrid_first_plan`, which
// only the service-role key can write — supabase-js updateUser on the client
// cannot touch app_metadata. That makes it the durable truth for "has this
// account already received its first free plan": reinstalling the app or
// clearing device storage cannot mint a second one.
//
// The client is never the time authority: it may only report a plan id and a
// bounded duration. startedAt/endsAt/status/replacementsUsed are generated
// and validated server-side in lib/firstPlanServer.ts (pure + unit-tested).
//
// Unconfigured (no SUPABASE_SERVICE_ROLE_KEY): 503 — the app degrades to its
// local record, the same pattern as the RevenueCat integration.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Serialize the read-modify-write per user within this instance so concurrent
// POSTs from one account can't both read the pre-write state. (Serverless may
// run multiple instances; the decision logic is idempotent per planId, so the
// residual cross-instance race is bounded to last-writer-wins between two
// requests that were each individually valid.)
const userLocks = new Map<string, Promise<void>>();
function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userLocks.get(userId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail: Promise<void> = run.then(
    () => undefined,
    () => undefined
  ).then(() => {
    if (userLocks.get(userId) === tail) userLocks.delete(userId);
  });
  userLocks.set(userId, tail);
  return run;
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
    const record = parseStoredRecord((data.user.app_metadata as Record<string, unknown> | undefined)?.hybrid_first_plan);
    return NextResponse.json(
      { configured: true, record: record ? deriveStatus(record, new Date()) : null },
      { headers: CORS }
    );
  } catch (e) {
    console.error("[first-plan] GET error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}

export async function POST(req: Request) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok || !auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  const userId = auth.userId;
  if (!rateLimitWindow(`firstplan:post:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ configured: false }, { status: 503, headers: CORS });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const event = parsePlanEvent(body);
  if (!event) return NextResponse.json({ error: "Invalid record" }, { status: 400, headers: CORS });

  try {
    return await withUserLock(userId, async () => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user) return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: CORS });
      const existing = parseStoredRecord(
        (data.user.app_metadata as Record<string, unknown> | undefined)?.hybrid_first_plan
      );

      const { next, changed } = applyPlanEvent(existing, event, new Date());
      if (changed) {
        const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { ...data.user.app_metadata, hybrid_first_plan: next },
        });
        if (updErr) {
          console.error("[first-plan] update failed:", updErr.message);
          return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
        }
      }
      return NextResponse.json({ configured: true, record: next }, { headers: CORS });
    });
  } catch (e) {
    console.error("[first-plan] POST error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
