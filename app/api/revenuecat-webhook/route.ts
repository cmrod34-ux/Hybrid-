import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CUSTOM_PLAN_PRODUCT,
  decideFulfillment,
  executeFulfillment,
  fetchRevokedTxns,
  type ExistingRequest,
} from "@/lib/coachFulfillment";

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
 * DURABILITY (mandatory once payments are enabled): every event id is
 * claimed by inserting into billing_events (PRIMARY KEY event_id). A
 * duplicate insert (23505) means the event was already processed and is
 * acknowledged untouched. Any OTHER database failure returns 500 so
 * RevenueCat RETRIES — this route never answers 200 while pretending an
 * event was durably recorded.
 *
 * PROCESSING (all idempotent):
 *   - every event: invalidate the user's cached subscription state;
 *   - CANCELLATION / EXPIRATION: the stored transaction_id becomes the
 *     durable revocation ledger — refunded purchases never fulfill;
 *   - NON_RENEWING_PURCHASE (custom plan) / INITIAL_PURCHASE (coaching):
 *     fulfill the paid coaching request server-side (same decision logic as
 *     /api/coach-request), so a successful purchase never depends on the
 *     client surviving long enough to call the API.
 * Only non-sensitive audit fields are stored: event id/type, app user id,
 * transaction id, product id, cancel reason. No receipts, no tokens, no
 * payment details.
 */

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

const COACHING_PRODUCT_PREFIX = "hybrid_coaching";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface RcEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  purchased_at_ms?: number;
  cancel_reason?: string;
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
  const event = (body?.event ?? undefined) as RcEvent | undefined;
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // MANDATORY persistent idempotency. No admin client or a failed insert
  // (other than the duplicate constraint) is a retryable server error.
  const admin = adminClient();
  if (!admin) {
    console.error("[RC webhook] SUPABASE_SERVICE_ROLE_KEY not set — cannot record events durably");
    return NextResponse.json({ error: "Event store unavailable" }, { status: 500 });
  }
  const { error: insErr } = await admin.from("billing_events").insert({
    event_id: event.id,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
    transaction_id: event.transaction_id ?? null,
    product_id: event.product_id ?? null,
    cancel_reason: event.cancel_reason ?? null,
  });
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error(`[RC webhook] idempotency insert failed (${insErr.code ?? "?"}): ${insErr.message}`);
    return NextResponse.json({ error: "Event store unavailable" }, { status: 500 });
  }

  // Cache invalidation — the next verified check reflects the new state.
  const { invalidateSubscriptionCache } = await import("@/lib/subscription");
  if (event.app_user_id) invalidateSubscriptionCache(event.app_user_id);

  // Server-side fulfillment safety net. app_user_id must be a Supabase uid
  // (the app logs RevenueCat in with it); RC anonymous ids are skipped —
  // those purchases fulfill later via /api/coach-request once identified.
  const uid = event.app_user_id && UUID_RE.test(event.app_user_id) ? event.app_user_id : null;
  const isCustomPlanPurchase = event.type === "NON_RENEWING_PURCHASE" && event.product_id === CUSTOM_PLAN_PRODUCT;
  const isCoachingPurchase =
    event.type === "INITIAL_PURCHASE" && (event.product_id ?? "").startsWith(COACHING_PRODUCT_PREFIX);
  if (uid && (isCustomPlanPurchase || isCoachingPurchase)) {
    try {
      const { data: reqRows } = await admin
        .from("coach_requests")
        .select("id, service, status, purchase_transaction_id, user_id")
        .eq("user_id", uid);
      const requests = (reqRows ?? []) as ExistingRequest[];
      const service = isCustomPlanPurchase ? ("custom_plan" as const) : ("coaching" as const);
      const txnId = isCustomPlanPurchase ? (event.transaction_id ?? null) : null;
      if (service === "custom_plan" && txnId) {
        const revoked = await fetchRevokedTxns(admin, uid);
        if (revoked.has(txnId)) {
          console.log(`[RC webhook] txn ${txnId} already revoked — no fulfillment`);
          return NextResponse.json({ ok: true });
        }
      }
      const decision = decideFulfillment({
        service,
        requests,
        txnId,
        hasCoachingEntitlement: isCoachingPurchase, // the purchase event IS the proof
      });
      if (decision.action === "create" || decision.action === "promote" || decision.action === "reuse") {
        const outcome = await executeFulfillment(admin, {
          userId: uid,
          athleteName: "Athlete", // intake collects the real name
          service,
          decision,
          txnId,
          productId: event.product_id ?? null,
          purchasedAt: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
        });
        console.log(`[RC webhook] fulfillment ${decision.action} → ${outcome.httpStatus} user=${uid}`);
      } else {
        console.log(`[RC webhook] fulfillment skipped (${decision.action}) user=${uid}`);
      }
    } catch (e) {
      // Fulfillment here is best-effort — the purchase is durably recorded
      // above and /api/coach-request can always complete it later.
      console.error("[RC webhook] fulfillment error:", e instanceof Error ? e.message : String(e));
    }
  }

  console.log(
    `[RC webhook] ${KNOWN_EVENTS.has(event.type) ? event.type : `UNKNOWN(${event.type})`} user=${event.app_user_id ?? "?"} id=${event.id}`,
  );

  return NextResponse.json({ ok: true });
}
