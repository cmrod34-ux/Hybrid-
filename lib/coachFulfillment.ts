// Paid coaching-request fulfillment — ONE transaction, ONE request.
//
// The decision logic is pure (unit-tested in scripts/tests/); the executor
// runs it against Supabase with the service role. Both the client-initiated
// path (POST /api/coach-request) and the webhook path (NON_RENEWING_PURCHASE
// / INITIAL_PURCHASE — the safety net when the app dies right after the
// Apple sheet) go through the SAME functions, so replays, duplicates, and
// races resolve identically everywhere:
//   * The chosen transaction id comes from RevenueCat's SERVER-fetched
//     subscriber payload or a verified webhook — never from the client.
//   * coach_requests.purchase_transaction_id carries a UNIQUE index — the
//     database is the final arbiter against double-fulfillment.
//   * billing_events CANCELLATION rows are the revocation ledger — refunded
//     transactions never fulfill.

import type { SupabaseClient } from "@supabase/supabase-js";

export const CUSTOM_PLAN_PRODUCT = "hybrid_custom_plan";
export const COACHING_ENTITLEMENT = "coaching";

export type ServiceType = "coaching" | "custom_plan";

export interface RcOneTimePurchase {
  id: string; // RevenueCat's unique transaction identifier
  purchase_date: string;
}

export interface ExistingRequest {
  id: string;
  service: string;
  status: string;
  purchase_transaction_id: string | null;
}

/** Pick the transaction that should fulfill a custom-plan request: the
 *  newest purchase that is neither revoked (refunded/cancelled) nor already
 *  attached to a request. */
export function pickCustomPlanTransaction(opts: {
  purchases: RcOneTimePurchase[];
  revokedTxnIds: ReadonlySet<string>;
  usedTxnIds: ReadonlySet<string>;
}): { txn: RcOneTimePurchase | null; hadPurchase: boolean } {
  const usable = opts.purchases
    .filter((p) => p.id && !opts.revokedTxnIds.has(p.id) && !opts.usedTxnIds.has(p.id))
    .sort((a, b) => Date.parse(b.purchase_date) - Date.parse(a.purchase_date));
  return { txn: usable[0] ?? null, hadPurchase: opts.purchases.length > 0 };
}

export type FulfillmentDecision =
  | { action: "reuse"; requestId: string } // this txn/service already has its request — return it (idempotent)
  | { action: "promote"; waitlistId: string } // same-service waitlist row converts to the paid request
  | { action: "create" }
  | { action: "conflict"; reason: string } // 409 — incompatible active request
  | { action: "reject"; reason: string }; // 402 — no valid, unused payment

const OPEN_STATUSES = new Set(["assessment_needed", "submitted", "under_review", "building", "ready", "revision_requested", "active"]);

/** Decide how a verified payment maps onto the athlete's existing requests.
 *  `txnId` is REQUIRED for custom_plan (the chosen unused transaction, or
 *  null when none is available) and null for coaching (entitlement-based). */
export function decideFulfillment(opts: {
  service: ServiceType;
  requests: ExistingRequest[]; // ALL of this athlete's rows, any status
  txnId: string | null;
  hasCoachingEntitlement: boolean;
  /** Set when the athlete HAS custom-plan purchases but every transaction is
   *  spent/revoked — turns "no payment" into an honest "already used". */
  allTransactionsConsumed?: boolean;
}): FulfillmentDecision {
  const { service, requests, txnId } = opts;

  // 1. Idempotent replay: the transaction already fulfilled a request —
  //    return that exact request, whatever its status.
  if (txnId) {
    const holder = requests.find((r) => r.purchase_transaction_id === txnId);
    if (holder) return { action: "reuse", requestId: holder.id };
  }

  // 2. Payment validity.
  if (service === "custom_plan" && !txnId) {
    return {
      action: "reject",
      reason: opts.allTransactionsConsumed
        ? "Your custom-plan purchase has already been used for a delivered plan. A new custom plan needs a new purchase."
        : "No verified custom-plan purchase found for this account.",
    };
  }
  if (service === "coaching" && !opts.hasCoachingEntitlement) {
    return { action: "reject", reason: "No active coaching subscription found for this account." };
  }

  // 3. Coaching is subscription-scoped: one open coaching request per
  //    subscriber — an existing open one IS the fulfillment.
  if (service === "coaching") {
    const openSame = requests.find((r) => r.service === "coaching" && OPEN_STATUSES.has(r.status));
    if (openSame) return { action: "reuse", requestId: openSame.id };
  }

  // 4. A same-service waitlist row converts into the paid request.
  const waitlistSame = requests.find((r) => r.service === service && r.status === "waitlist");
  if (waitlistSame) return { action: "promote", waitlistId: waitlistSame.id };

  // 5. An open PAID request for the OTHER service is a real conflict the
  //    athlete must resolve (a different-service WAITLIST row is not — it
  //    stays untouched alongside the new paid request).
  const openOther = requests.find((r) => r.service !== service && OPEN_STATUSES.has(r.status));
  if (openOther) {
    return {
      action: "conflict",
      reason: `You already have an active ${openOther.service === "coaching" ? "coaching" : "custom-plan"} request. Complete or close it before starting a ${service === "coaching" ? "coaching" : "custom-plan"} request.`,
    };
  }
  // An open same-service custom-plan request without this transaction:
  // return it rather than double-opening (its own purchase backs it).
  const openSame = requests.find((r) => r.service === service && OPEN_STATUSES.has(r.status));
  if (openSame) return { action: "reuse", requestId: openSame.id };

  return { action: "create" };
}

export interface FulfillmentOutcome {
  httpStatus: 200 | 402 | 409 | 500;
  request?: unknown;
  existing?: boolean;
  error?: string;
}

/** Execute a decision against the database (service role). All writes stamp
 *  the transaction linkage; the unique index resolves races — a 23505 means
 *  someone else just fulfilled this txn, so we re-read and return theirs
 *  (same user) or refuse (different user). */
export async function executeFulfillment(
  admin: SupabaseClient,
  opts: {
    userId: string;
    athleteName: string;
    service: ServiceType;
    decision: FulfillmentDecision;
    txnId: string | null;
    productId: string | null;
    purchasedAt: string | null;
  },
): Promise<FulfillmentOutcome> {
  const { userId, service, decision, txnId } = opts;
  const stamp = txnId
    ? {
        purchase_transaction_id: txnId,
        purchase_product_id: opts.productId,
        purchased_at: opts.purchasedAt,
        fulfilled_at: new Date().toISOString(),
      }
    : { fulfilled_at: new Date().toISOString() };

  if (decision.action === "reject") return { httpStatus: 402, error: decision.reason };
  if (decision.action === "conflict") return { httpStatus: 409, error: decision.reason };

  if (decision.action === "reuse") {
    const { data, error } = await admin.from("coach_requests").select("*").eq("id", decision.requestId).single();
    if (error || !data) return { httpStatus: 500, error: "Lookup failed" };
    return { httpStatus: 200, request: data, existing: true };
  }

  if (decision.action === "promote") {
    const { data, error } = await admin
      .from("coach_requests")
      .update({ status: "assessment_needed", updated_at: new Date().toISOString(), ...stamp })
      .eq("id", decision.waitlistId)
      .eq("status", "waitlist") // atomic: only an actual waitlist row converts
      .select()
      .single();
    if (error?.code === "23505") return resolveTxnRace(admin, userId, txnId);
    if (error || !data) return { httpStatus: 500, error: "Waitlist promotion failed" };
    return { httpStatus: 200, request: data };
  }

  // create
  const { data, error } = await admin
    .from("coach_requests")
    .insert({ user_id: userId, athlete_name: opts.athleteName, service, status: "assessment_needed", ...stamp })
    .select()
    .single();
  if (error?.code === "23505") return resolveTxnRace(admin, userId, txnId);
  if (error || !data) return { httpStatus: 500, error: "Server error" };
  return { httpStatus: 200, request: data };
}

/** The unique index fired: this transaction already backs some request. */
async function resolveTxnRace(admin: SupabaseClient, userId: string, txnId: string | null): Promise<FulfillmentOutcome> {
  if (!txnId) return { httpStatus: 500, error: "Server error" };
  const { data } = await admin
    .from("coach_requests")
    .select("*")
    .eq("purchase_transaction_id", txnId)
    .single();
  const holder = data as { user_id?: string } | null;
  if (holder && holder.user_id === userId) return { httpStatus: 200, request: holder, existing: true };
  return { httpStatus: 409, error: "This purchase has already been used on another account." };
}

/** Revoked (refunded/cancelled) transaction ids for a user, from the durable
 *  billing_events ledger the webhook writes. */
export async function fetchRevokedTxns(admin: SupabaseClient, appUserId: string): Promise<Set<string>> {
  const { data } = await admin
    .from("billing_events")
    .select("transaction_id")
    .eq("app_user_id", appUserId)
    .in("event_type", ["CANCELLATION", "EXPIRATION"])
    .not("transaction_id", "is", null);
  return new Set(((data ?? []) as { transaction_id: string }[]).map((r) => r.transaction_id));
}
