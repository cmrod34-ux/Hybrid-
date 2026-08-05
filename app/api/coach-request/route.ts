import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser, rateLimitWindow, capString } from "@/lib/verifyUser";
import { verifiedEntitlements } from "@/lib/subscription";

// Server-side creation of PAID coaching requests.
//
// The database (coaching_v2_security.sql) forbids clients from inserting
// paid-entry rows — athletes can only self-create WAITLIST rows. This route
// is the only path to an 'assessment_needed' request, and it verifies the
// payment with RevenueCat's REST API (secret key) BEFORE inserting with the
// service role:
//   - coaching     → an ACTIVE "coaching" entitlement
//   - custom_plan  → the one-time custom-plan product purchase
// A server-granted developer/admin role bypasses payment for testing.
//
// Unconfigured (missing service-role key): 503 — the client explains that
// purchases aren't live yet. Provider errors NEVER create a request.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Product/entitlement ids — mirrors HybridApp/lib/pricing.ts.
const CUSTOM_PLAN_PRODUCT = "hybrid_custom_plan";
const COACHING_ENTITLEMENT = "coaching";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok || !auth.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  if (!rateLimitWindow(`coachreq:${auth.userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ configured: false }, { status: 503, headers: CORS });

  let service: string | null = null;
  let athleteName = "";
  try {
    const body = (await req.json()) as { service?: unknown; athleteName?: unknown };
    service = body.service === "coaching" || body.service === "custom_plan" ? body.service : null;
    athleteName = capString(body.athleteName, 80) || "Athlete";
  } catch {
    service = null;
  }
  if (!service) return NextResponse.json({ error: "Invalid service" }, { status: 400, headers: CORS });

  // Payment verification — the mobile client is never the authority.
  const isPrivileged = auth.role === "developer" || auth.role === "admin";
  if (!isPrivileged) {
    const ents = await verifiedEntitlements(auth.userId);
    if (ents.status !== "ok") {
      return NextResponse.json(
        { error: "Payment verification is unavailable right now — you have not been charged twice; try again shortly." },
        { status: 503, headers: CORS },
      );
    }
    const paid =
      service === "coaching" ? ents.active.has(COACHING_ENTITLEMENT) : ents.oneTimeProducts.has(CUSTOM_PLAN_PRODUCT);
    if (!paid) {
      return NextResponse.json({ error: "No verified purchase found for this service." }, { status: 402, headers: CORS });
    }
  }

  try {
    // One open request at a time — idempotent against double-taps/replays.
    const { data: existing, error: exErr } = await admin
      .from("coach_requests")
      .select("id,status,service")
      .eq("user_id", auth.userId)
      .not("status", "in", "(completed)")
      .limit(1);
    if (exErr) return NextResponse.json({ error: "Lookup failed" }, { status: 500, headers: CORS });
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, request: existing[0], existing: true }, { headers: CORS });
    }

    const { data, error } = await admin
      .from("coach_requests")
      .insert({ user_id: auth.userId, athlete_name: athleteName, service, status: "assessment_needed" })
      .select()
      .single();
    if (error) {
      console.error("[coach-request] insert failed:", error.message);
      return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
    }
    return NextResponse.json({ ok: true, request: data }, { headers: CORS });
  } catch (e) {
    console.error("[coach-request] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
