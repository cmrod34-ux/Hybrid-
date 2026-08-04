import { NextRequest, NextResponse } from "next/server";

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
 * secret is configured. IDEMPOTENT: events carry a unique id; re-delivered
 * events are acknowledged without reprocessing, so duplicates can never
 * corrupt subscription state.
 */

// In-memory idempotency window (per instance). RevenueCat retries within
// minutes, which this comfortably covers; processing is also intrinsically
// idempotent (cache invalidation), so a cold instance re-processing an old
// event is harmless by design.
const seenEvents = new Map<string, number>();
const SEEN_TTL_MS = 60 * 60 * 1000;

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

  // Idempotency: acknowledge duplicates without reprocessing.
  const now = Date.now();
  for (const [id, at] of seenEvents) if (now - at > SEEN_TTL_MS) seenEvents.delete(id);
  if (seenEvents.has(event.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  seenEvents.set(event.id, now);

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
