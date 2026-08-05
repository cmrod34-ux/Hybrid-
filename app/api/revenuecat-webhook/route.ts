import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * RevenueCat webhook receiver — keeps Hybrid's server-side view of
 * subscription state in sync with the payment provider across the whole
 * lifecycle (purchase, renewal, billing issue, cancellation, expiration,
 * refund). RevenueCat itself remains the source of truth (lib/subscription.ts
 * verifies against its REST API); this endpoint's job is cache invalidation
 * and an auditable event trail.
 *
 * SECURITY: RevenueCat sends a fixed Authorization header configured in
 * their dashboard — it must match REVENUECAT_WEBHOOK_AUTH (server env only).
 * Requests without it are rejected; the route is disabled (503) until the
 * secret is configured. IDEMPOTENT: every event id is recorded in the
 * billing_events table (PRIMARY KEY event_id, service-role-only access,
 * created by coaching_v2_security.sql); a re-delivered event hits the unique
 * constraint and is acknowledged without reprocessing — durable across
 * instances and restarts, no in-memory map.
 */

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// RevenueCat event types we acknowledge explicitly (all others are accepted
// and logged — unknown types must never bounce the webhook).
const KNOWN_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "CANCELLATION",
  "UNCANCELLATION",
  "BILLING_ISSUE",
  "EXPIRATION",
  "REFUND",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER",
]);

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
  const event = body?.event as
    | { id?: string; type?: string; app_user_id?: string; expiration_at_ms?: number }
    | undefined;
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // PERSISTENT idempotency: the insert either claims this event id or hits
  // the primary-key constraint (23505) — in which case it was already
  // processed (possibly by another instance) and is acknowledged untouched.
  const admin = adminClient();
  if (admin) {
    const { error: insErr } = await admin.from("billing_events").insert({
      event_id: event.id,
      event_type: event.type,
      app_user_id: event.app_user_id ?? null,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      // Table missing (migration not applied) or transient DB error: continue —
      // processing is cache invalidation, which is intrinsically idempotent —
      // but say so in the log rather than pretending durability exists.
      console.warn(`[RC webhook] idempotency record failed (${insErr.code ?? "?"}): processing anyway`);
    }
  } else {
    console.warn("[RC webhook] SUPABASE_SERVICE_ROLE_KEY not set — no persistent idempotency record");
  }

  // Processing: invalidate this user's cached plan so the next verified
  // check reflects the new state immediately (purchase, cancel, refund…).
  const { invalidateSubscriptionCache } = await import("@/lib/subscription");
  if (event.app_user_id) invalidateSubscriptionCache(event.app_user_id);

  // Log a compact, non-sensitive audit line (no tokens, no payment details).
  console.log(
    `[RC webhook] ${KNOWN_EVENTS.has(event.type) ? event.type : `UNKNOWN(${event.type})`} user=${event.app_user_id ?? "?"} id=${event.id}`,
  );

  return NextResponse.json({ ok: true });
}
