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

/** Pick the transaction a custom-plan fulfillment should examine: the NEWEST
 *  verified, non-refunded purchase — WITHOUT filtering out transactions that
 *  already back a request. Whether that transaction is already linked is for
 *  decideFulfillment to resolve (same user → return that exact request;
 *  another user → conflict). Pre-filtering "used" transactions here is what
 *  turned a paid customer's post-webhook retry into a 402. */
export function pickCustomPlanTransaction(opts: {
  purchases: RcOneTimePurchase[];
  revokedTxnIds: ReadonlySet<string>;
}): { txn: RcOneTimePurchase | null; hadPurchase: boolean } {
  const usable = opts.purchases
    .filter((p) => p.id && !opts.revokedTxnIds.has(p.id))
    .sort((a, b) => Date.parse(b.purchase_date) - Date.parse(a.purchase_date));
  return { txn: usable[0] ?? null, hadPurchase: opts.purchases.length > 0 };
}

export type FulfillmentDecision =
  | { action: "reuse"; requestId: string } // this txn/service already has its request — return it (idempotent)
  | { action: "promote"; waitlistId: string } // same-service waitlist row converts to the paid request
  | { action: "create" }
  | { action: "conflict"; reason: string } // 409 — incompatible active request
  | { action: "reject"; reason: string }; // 402 — no valid, unused payment

const OPEN_STATUS_LIST = ["assessment_needed", "submitted", "under_review", "building", "ready", "revision_requested", "active"] as const;
const OPEN_STATUSES = new Set<string>(OPEN_STATUS_LIST);

/** Decide how a verified payment maps onto the athlete's existing requests.
 *  `txnId` is REQUIRED for custom_plan (the chosen unused transaction, or
 *  null when none is available) and null for coaching (entitlement-based). */
export function decideFulfillment(opts: {
  service: ServiceType;
  requests: ExistingRequest[]; // ALL of this athlete's rows, any status
  txnId: string | null;
  hasCoachingEntitlement: boolean;
  /** Set when the athlete HAS custom-plan purchases but every transaction is
   *  refunded/revoked — turns "no payment" into an honest explanation. */
  allRevoked?: boolean;
}): FulfillmentDecision {
  const { service, requests, txnId } = opts;

  // 1. Idempotent replay — the FIRST rule, before any validity gate: if this
  //    transaction already fulfilled one of the athlete's requests, return
  //    that exact request, whatever its status (assessment_needed after a
  //    webhook-first fulfillment, active, completed, …). This is what makes
  //    webhook-first + immediate app retry succeed instead of 402ing a
  //    customer who just paid.
  if (txnId) {
    const holder = requests.find((r) => r.purchase_transaction_id === txnId);
    if (holder) return { action: "reuse", requestId: holder.id };
  }

  // 2. Payment validity.
  if (service === "custom_plan" && !txnId) {
    return {
      action: "reject",
      reason: opts.allRevoked
        ? "Your custom-plan purchase was refunded, so it can no longer open a request. A new custom plan needs a new purchase."
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
  httpStatus: 200 | 402 | 409 | 500 | 503;
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
    if (error?.code === "23505") return resolveUniqueRace(admin, userId, service, txnId);
    if (error || !data) return { httpStatus: 500, error: "Waitlist promotion failed" };
    return { httpStatus: 200, request: data };
  }

  // create
  const { data, error } = await admin
    .from("coach_requests")
    .insert({ user_id: userId, athlete_name: opts.athleteName, service, status: "assessment_needed", ...stamp })
    .select()
    .single();
  if (error?.code === "23505") return resolveUniqueRace(admin, userId, service, txnId);
  if (error || !data) return { httpStatus: 500, error: "Server error" };
  return { httpStatus: 200, request: data };
}

/** A unique index fired mid-write. Two possible arbiters:
 *   - purchase_transaction_id: the transaction already backs some request —
 *     the same user gets THAT request; another user gets 409.
 *   - open-coaching-per-user: a concurrent webhook/API call just created the
 *     user's open coaching request — return it with existing: true (never a
 *     500, and by construction never another user's row). */
async function resolveUniqueRace(
  admin: SupabaseClient,
  userId: string,
  service: ServiceType,
  txnId: string | null,
): Promise<FulfillmentOutcome> {
  if (txnId) {
    const { data } = await admin
      .from("coach_requests")
      .select("*")
      .eq("purchase_transaction_id", txnId)
      .single();
    const holder = data as { user_id?: string } | null;
    if (holder && holder.user_id === userId) return { httpStatus: 200, request: holder, existing: true };
    if (holder) return { httpStatus: 409, error: "This purchase has already been used on another account." };
  }
  // Open-coaching uniqueness (or a txn lookup that found nothing): the
  // winning row is this user's open request for the same service.
  const { data: open } = await admin
    .from("coach_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("service", service)
    .in("status", [...OPEN_STATUS_LIST])
    .single();
  if (open) return { httpStatus: 200, request: open, existing: true };
  return { httpStatus: 500, error: "Server error" };
}

/** Thrown when the refund ledger cannot be consulted — callers must FAIL
 *  CLOSED (retryable 503/500), never fulfill on an unreadable ledger. */
export class RevocationCheckError extends Error {
  constructor() {
    super("Refund ledger unavailable");
    this.name = "RevocationCheckError";
  }
}

/** Revoked (refunded/cancelled) transaction ids for a user, from the durable
 *  billing_events ledger the webhook writes. An EMPTY result means "no
 *  refunds"; a query ERROR means "unknown" and throws — treating an
 *  unreadable ledger as refund-free would let a refunded purchase fulfill
 *  during a database blip. */
export async function fetchRevokedTxns(admin: SupabaseClient, appUserId: string): Promise<Set<string>> {
  const { data, error } = await admin
    .from("billing_events")
    .select("transaction_id")
    .eq("app_user_id", appUserId)
    .in("event_type", ["CANCELLATION", "EXPIRATION"])
    .not("transaction_id", "is", null);
  if (error) throw new RevocationCheckError();
  return new Set(((data ?? []) as { transaction_id: string }[]).map((r) => r.transaction_id));
}

/* ── Orchestrators — the full flows behind /api/coach-request and the
      RevenueCat webhook, dependency-injected so tests can run BOTH against
      one shared database and prove they converge on one transaction → one
      request. ── */

export interface CoachRequestDeps {
  /** Server-side RevenueCat lookups (never client-supplied). */
  fetchCustomPlanPurchases: (userId: string) => Promise<{ ok: boolean; purchases: RcOneTimePurchase[] }>;
  fetchCoachingActive: (userId: string) => Promise<{ ok: boolean; active: boolean }>;
}

/** The complete /api/coach-request flow after auth: verify payment, decide,
 *  execute. Newest-transaction-first: if the newest valid transaction is
 *  already linked to one of THIS user's requests (webhook got there first),
 *  that exact request comes back with 200 — a paid retry never 402s. */
export async function processCoachRequest(
  admin: SupabaseClient,
  opts: { userId: string; athleteName: string; service: ServiceType; isPrivileged: boolean },
  deps: CoachRequestDeps,
): Promise<FulfillmentOutcome> {
  const { userId, service } = opts;
  const { data: reqRows, error: reqErr } = await admin
    .from("coach_requests")
    .select("id, service, status, purchase_transaction_id, user_id")
    .eq("user_id", userId);
  if (reqErr) return { httpStatus: 500, error: "Lookup failed" };
  const requests = (reqRows ?? []) as ExistingRequest[];

  let txnId: string | null = null;
  let purchasedAt: string | null = null;
  let allRevoked = false;
  let hasCoaching = false;

  if (opts.isPrivileged) {
    // Developer/admin test mode: payment bypassed; custom-plan rows get a
    // synthetic transaction so the uniqueness machinery still runs.
    hasCoaching = true;
    if (service === "custom_plan") {
      txnId = `dev-${userId}-${Date.now()}`;
      purchasedAt = new Date().toISOString();
    }
  } else if (service === "coaching") {
    const ent = await deps.fetchCoachingActive(userId);
    if (!ent.ok) {
      return { httpStatus: 503, error: "Payment verification is unavailable right now — try again shortly. You have not been charged twice." };
    }
    hasCoaching = ent.active;
  } else {
    const rc = await deps.fetchCustomPlanPurchases(userId);
    if (!rc.ok) {
      return { httpStatus: 503, error: "Payment verification is unavailable right now — try again shortly. You have not been charged twice." };
    }
    // FAIL CLOSED: an unreadable refund ledger must never read as "no
    // refunds" — no request is created, the client retries.
    let revoked: Set<string>;
    try {
      revoked = await fetchRevokedTxns(admin, userId);
    } catch {
      return { httpStatus: 503, error: "Payment verification is unavailable right now — try again shortly. You have not been charged twice." };
    }
    const pick = pickCustomPlanTransaction({ purchases: rc.purchases, revokedTxnIds: revoked });
    txnId = pick.txn?.id ?? null;
    purchasedAt = pick.txn?.purchase_date ?? null;
    allRevoked = pick.txn === null && pick.hadPurchase;
  }

  const decision = decideFulfillment({ service, requests, txnId, hasCoachingEntitlement: hasCoaching, allRevoked });
  return executeFulfillment(admin, {
    userId,
    athleteName: opts.athleteName,
    service,
    decision,
    txnId,
    productId: txnId ? (opts.isPrivileged ? "dev" : CUSTOM_PLAN_PRODUCT) : null,
    purchasedAt,
  });
}

export interface RcWebhookEvent {
  id: string;
  type: string;
  app_user_id?: string | null;
  product_id?: string | null;
  transaction_id?: string | null;
  purchased_at_ms?: number | null;
  cancel_reason?: string | null;
}

export interface WebhookOutcome {
  status: 200 | 500;
  body: Record<string, unknown>;
}

const COACHING_PRODUCT_PREFIX = "hybrid_coaching";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The complete webhook flow after auth, with DURABLE retry semantics:
 *  an event is only marked `processed` once every piece of required work
 *  succeeded. A duplicate of a processed event returns 200 untouched; a
 *  duplicate of a `received`/`failed` event RERUNS the unfinished work
 *  (all of it idempotent — the unique transaction index is the final race
 *  arbiter). Transient failures mark the event `failed` and return 500 so
 *  RevenueCat retries. */
export async function processWebhookEvent(
  admin: SupabaseClient,
  event: RcWebhookEvent,
  deps: { invalidate: (uid: string) => void },
): Promise<WebhookOutcome> {
  // 1. Claim or re-open the event.
  let attempts = 0;
  const { error: insErr } = await admin.from("billing_events").insert({
    event_id: event.id,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
    transaction_id: event.transaction_id ?? null,
    product_id: event.product_id ?? null,
    cancel_reason: event.cancel_reason ?? null,
    status: "received",
  });
  if (insErr) {
    if (insErr.code !== "23505") return { status: 500, body: { error: "Event store unavailable" } };
    const { data: existing, error: exErr } = await admin
      .from("billing_events")
      .select("status, attempt_count")
      .eq("event_id", event.id)
      .single();
    if (exErr || !existing) return { status: 500, body: { error: "Event store unavailable" } };
    const row = existing as { status?: string; attempt_count?: number };
    if (row.status === "processed") return { status: 200, body: { ok: true, duplicate: true } };
    attempts = row.attempt_count ?? 0; // received/processing/failed → rerun the work
  }

  // 2. The work — all idempotent.
  let terminalNote: string | null = null;
  try {
    if (event.app_user_id) deps.invalidate(event.app_user_id);

    const uid = event.app_user_id && UUID_RE.test(event.app_user_id) ? event.app_user_id : null;
    const isCustomPlanPurchase = event.type === "NON_RENEWING_PURCHASE" && event.product_id === CUSTOM_PLAN_PRODUCT;
    const isCoachingPurchase =
      event.type === "INITIAL_PURCHASE" && (event.product_id ?? "").startsWith(COACHING_PRODUCT_PREFIX);

    if (uid && (isCustomPlanPurchase || isCoachingPurchase)) {
      const { data: reqRows, error: reqErr } = await admin
        .from("coach_requests")
        .select("id, service, status, purchase_transaction_id, user_id")
        .eq("user_id", uid);
      if (reqErr) throw new Error("request lookup failed");
      const requests = (reqRows ?? []) as ExistingRequest[];
      const service = isCustomPlanPurchase ? ("custom_plan" as const) : ("coaching" as const);
      const txnId = isCustomPlanPurchase ? (event.transaction_id ?? null) : null;

      let revokedTxn = false;
      if (service === "custom_plan" && txnId) {
        const revoked = await fetchRevokedTxns(admin, uid);
        revokedTxn = revoked.has(txnId);
      }
      if (!revokedTxn) {
        const decision = decideFulfillment({ service, requests, txnId, hasCoachingEntitlement: isCoachingPurchase });
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
          if (outcome.httpStatus >= 500) throw new Error(outcome.error ?? "fulfillment failed");
          // 402/409 are TERMINAL for this event (retrying can't change them);
          // note them, but the event still counts as processed.
          if (outcome.httpStatus !== 200) terminalNote = `fulfillment ${outcome.httpStatus}: ${outcome.error ?? ""}`;
        }
      } else {
        terminalNote = "transaction revoked — no fulfillment";
      }
    }

    // 3. Only now is the event durably complete.
    const { error: doneErr } = await admin
      .from("billing_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), attempt_count: attempts + 1, last_error: terminalNote })
      .eq("event_id", event.id);
    if (doneErr) {
      // Work succeeded but the completion mark didn't: stay retryable — the
      // rerun is idempotent and will try to mark again.
      return { status: 500, body: { error: "Event store unavailable" } };
    }
    return { status: 200, body: { ok: true } };
  } catch (e) {
    await admin
      .from("billing_events")
      .update({
        status: "failed",
        attempt_count: attempts + 1,
        last_error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
      })
      .eq("event_id", event.id);
    return { status: 500, body: { error: "Processing failed — retry" } };
  }
}
