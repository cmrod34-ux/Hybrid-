import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processWebhookEvent, type RcWebhookEvent } from "@/lib/coachFulfillment";

/**
 * RevenueCat webhook receiver — the server-controlled path that keeps
 * Hybrid's view of payments truthful even when the app dies the instant the
 * Apple sheet closes.
 *
 * SECURITY: RevenueCat sends a fixed Authorization header configured in
 * their dashboard — it must match REVENUECAT_WEBHOOK_AUTH (server env only).
 * Requests without it are rejected; the route is disabled (503) until the
 * secret is configured.
 *
 * DURABILITY: the full state machine lives in
 * lib/coachFulfillment.processWebhookEvent — an event is only marked
 * `processed` after ALL required work (cache invalidation, refund ledger,
 * server-side fulfillment) succeeded. Duplicates of processed events return
 * 200 untouched; duplicates of received/failed events RERUN the unfinished
 * work; transient failures return 500 so RevenueCat retries. Only
 * non-sensitive audit fields are stored (event id/type, app user id,
 * transaction id, product id, cancel reason) — no receipts, tokens, or
 * payment details, and nothing sensitive is logged.
 */

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret) {
    // Not configured yet — refuse quietly (RevenueCat will retry after setup).
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = (body?.event ?? undefined) as Partial<RcWebhookEvent> | undefined;
  if (!raw?.id || !raw.type) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const admin = adminClient();
  if (!admin) {
    console.error("[RC webhook] SUPABASE_SERVICE_ROLE_KEY not set — cannot record events durably");
    return NextResponse.json({ error: "Event store unavailable" }, { status: 500 });
  }

  const { invalidateSubscriptionCache } = await import("@/lib/subscription");
  const outcome = await processWebhookEvent(admin, raw as RcWebhookEvent, { invalidate: invalidateSubscriptionCache });
  console.log(`[RC webhook] ${raw.type} id=${raw.id} → ${outcome.status}${outcome.body.duplicate ? " (duplicate)" : ""}`);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
