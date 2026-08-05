// Paid-request fulfillment — executed tests over the decision logic, the
// executor, AND the two orchestrators (processCoachRequest = the API flow,
// processWebhookEvent = the webhook flow) running END-TO-END against one
// shared in-memory database that enforces the same unique constraints the
// real migrations create (purchase_transaction_id, billing_events.event_id).
// The live-database versions of the constraints are exercised by the app
// repo's rls-integration-test.ts once migrations are applied.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decideFulfillment,
  executeFulfillment,
  pickCustomPlanTransaction,
  processCoachRequest,
  processWebhookEvent,
  type ExistingRequest,
  type RcWebhookEvent,
} from "../../lib/coachFulfillment";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ── fake Supabase: the chains the fulfillment code uses, two tables, the
      real unique keys, thenable list queries, and injectable failures ── */

type Row = Record<string, unknown>;

function fakeDb(seed?: { coach_requests?: Row[]; billing_events?: Row[] }) {
  const tables: Record<string, Row[]> = {
    coach_requests: (seed?.coach_requests ?? []).map((r) => ({ ...r })),
    billing_events: (seed?.billing_events ?? []).map((r) => ({ ...r })),
  };
  let nextId = 1000;
  const failQueue: string[] = []; // "table:op" entries — next matching call errors

  const uniqueViolation = (table: string, row: Row, exceptRef?: Row): boolean => {
    if (table === "coach_requests" && row.purchase_transaction_id != null) {
      return tables.coach_requests.some((r) => r !== exceptRef && r.purchase_transaction_id === row.purchase_transaction_id);
    }
    if (table === "billing_events") {
      return tables.billing_events.some((r) => r !== exceptRef && r.event_id === row.event_id);
    }
    return false;
  };

  function from(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let op: "select" | "insert" | "update" = "select";
    let payload: Row = {};
    const exec = () => {
      if (failQueue[0] === `${table}:${op}`) {
        failQueue.shift();
        return { data: null, error: { code: "XX000", message: "injected failure" } };
      }
      if (op === "insert") {
        if (uniqueViolation(table, payload)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        const row = { id: `r${nextId++}`, ...payload };
        tables[table].push(row);
        return { data: [row], error: null };
      }
      if (op === "update") {
        const targets = tables[table].filter((r) => filters.every((f) => f(r)));
        if (targets.length === 0) return { data: [], error: null };
        for (const t of targets) {
          const merged = { ...t, ...payload };
          if (uniqueViolation(table, merged, t)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        targets.forEach((t) => Object.assign(t, payload));
        return { data: targets, error: null };
      }
      return { data: tables[table].filter((r) => filters.every((f) => f(r))), error: null };
    };
    const api = {
      select() {
        return api;
      },
      insert(obj: Row) {
        op = "insert";
        payload = obj;
        return api;
      },
      update(obj: Row) {
        op = "update";
        payload = obj;
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val);
        return api;
      },
      in(col: string, vals: unknown[]) {
        filters.push((r) => vals.includes(r[col]));
        return api;
      },
      not(col: string, operator: string, val: unknown) {
        if (operator === "is" && val === null) filters.push((r) => r[col] != null);
        return api;
      },
      async single() {
        const { data, error } = exec();
        if (error) return { data: null, error };
        const rows = data ?? [];
        return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: rows.length === 0 ? "not found" : "multiple rows" } };
      },
      // Thenable: awaiting without .single() returns the row LIST.
      then(resolve: (v: { data: Row[] | null; error: { code?: string; message: string } | null }) => unknown) {
        return Promise.resolve(exec()).then(resolve);
      },
    };
    return api;
  }
  return {
    client: { from } as unknown as SupabaseClient,
    tables,
    failNext(table: string, op: string) {
      failQueue.push(`${table}:${op}`);
    },
  };
}

const U = "11111111-2222-3333-4444-555555555555"; // uuid-shaped Supabase uid
const OTHER = "99999999-8888-7777-6666-555555555555";

const rcWith = (purchases: { id: string; purchase_date: string }[]) => ({
  fetchCustomPlanPurchases: async () => ({ ok: true, purchases }),
  fetchCoachingActive: async () => ({ ok: true, active: true }),
});
const noopInvalidate = { invalidate: () => {} };
const purchaseEvent = (id: string, txn: string, overrides: Partial<RcWebhookEvent> = {}): RcWebhookEvent => ({
  id,
  type: "NON_RENEWING_PURCHASE",
  app_user_id: U,
  product_id: "hybrid_custom_plan",
  transaction_id: txn,
  purchased_at_ms: 1754300000000,
  ...overrides,
});
const apiCall = (db: ReturnType<typeof fakeDb>, purchases: { id: string; purchase_date: string }[]) =>
  processCoachRequest(db.client, { userId: U, athleteName: "A", service: "custom_plan", isPrivileged: false }, rcWith(purchases));

(async () => {
  console.log("\n— pickCustomPlanTransaction: newest-first, refunds only filter —");
  const purchases = [
    { id: "txn-1", purchase_date: "2026-08-01T10:00:00Z" },
    { id: "txn-2", purchase_date: "2026-08-03T10:00:00Z" },
  ];
  check(
    "newest transaction is examined even when already linked (no 'used' pre-filter)",
    pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set() }).txn?.id === "txn-2",
  );
  check(
    "refunded newest → older valid transaction",
    pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set(["txn-2"]) }).txn?.id === "txn-1",
  );
  const allRevoked = pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set(["txn-1", "txn-2"]) });
  check("all refunded → none picked, hadPurchase true", allRevoked.txn === null && allRevoked.hadPurchase);
  check("no purchases → none picked", pickCustomPlanTransaction({ purchases: [], revokedTxnIds: new Set() }).txn === null);

  console.log("\n— decideFulfillment: reuse-first across every request status —");
  for (const status of ["assessment_needed", "active", "completed"]) {
    const d = decideFulfillment({
      service: "custom_plan",
      requests: [{ id: `req-${status}`, service: "custom_plan", status, purchase_transaction_id: "txn-2" }],
      txnId: "txn-2",
      hasCoachingEntitlement: false,
    });
    check(`linked transaction returns the SAME request when ${status}`, d.action === "reuse" && (d as { requestId: string }).requestId === `req-${status}`);
  }
  const dRefund = decideFulfillment({ service: "custom_plan", requests: [], txnId: null, hasCoachingEntitlement: false, allRevoked: true });
  check("all-refunded → honest 402 reason", dRefund.action === "reject" && /refunded/.test((dRefund as { reason: string }).reason));
  const dNone = decideFulfillment({ service: "custom_plan", requests: [], txnId: null, hasCoachingEntitlement: false });
  check("no purchase → 402 reason", dNone.action === "reject" && /No verified/.test((dNone as { reason: string }).reason));
  const dPromote = decideFulfillment({
    service: "custom_plan",
    requests: [{ id: "wl-1", service: "custom_plan", status: "waitlist", purchase_transaction_id: null }],
    txnId: "txn-9",
    hasCoachingEntitlement: false,
  });
  check("same-service waitlist promotes", dPromote.action === "promote");
  const dConflict = decideFulfillment({
    service: "custom_plan",
    requests: [{ id: "co-1", service: "coaching", status: "active", purchase_transaction_id: null }],
    txnId: "txn-9",
    hasCoachingEntitlement: false,
  });
  check("open other-service paid request → conflict", dConflict.action === "conflict");

  console.log("\n— E2E: webhook-first, API-second (the reported race) —");
  const db1 = fakeDb();
  const wh1 = await processWebhookEvent(db1.client, purchaseEvent("evt-1", "txn-2"), noopInvalidate);
  check("webhook fulfills the purchase (200)", wh1.status === 200);
  check("webhook created exactly one assessment_needed request", db1.tables.coach_requests.length === 1 && db1.tables.coach_requests[0].status === "assessment_needed");
  const api1 = await apiCall(db1, purchases);
  check(
    "immediate app retry returns THAT request with 200 — not 402",
    api1.httpStatus === 200 && (api1.request as Row).id === db1.tables.coach_requests[0].id && api1.existing === true,
  );
  check("still exactly one request", db1.tables.coach_requests.length === 1);

  console.log("\n— E2E: API-first, webhook replay second —");
  const db2 = fakeDb();
  const api2 = await apiCall(db2, purchases);
  check("API fulfills first (200)", api2.httpStatus === 200);
  const wh2 = await processWebhookEvent(db2.client, purchaseEvent("evt-2", "txn-2"), noopInvalidate);
  check("webhook after API acknowledges without a second request", wh2.status === 200 && db2.tables.coach_requests.length === 1);

  console.log("\n— E2E: duplicate API calls + simultaneous API/webhook —");
  const db3 = fakeDb();
  const [s1, s2] = await Promise.all([apiCall(db3, purchases), processWebhookEvent(db3.client, purchaseEvent("evt-3", "txn-2"), noopInvalidate)]);
  check("simultaneous API + webhook → one request", db3.tables.coach_requests.length === 1 && s1.httpStatus === 200 && s2.status === 200);
  const again = await apiCall(db3, purchases);
  check("repeat API call → same request, still one row", again.httpStatus === 200 && db3.tables.coach_requests.length === 1);

  console.log("\n— E2E: webhook durability (insert ok, fulfillment fails → retry succeeds) —");
  const db4 = fakeDb();
  db4.failNext("coach_requests", "insert"); // transient DB failure during fulfillment
  const whFail = await processWebhookEvent(db4.client, purchaseEvent("evt-4", "txn-2"), noopInvalidate);
  const evRow = db4.tables.billing_events.find((r) => r.event_id === "evt-4");
  check("failed fulfillment → 500 (retryable), event marked failed", whFail.status === 500 && evRow?.status === "failed" && db4.tables.coach_requests.length === 0);
  const whRetry = await processWebhookEvent(db4.client, purchaseEvent("evt-4", "txn-2"), noopInvalidate);
  check(
    "RevenueCat retry of the SAME event completes the fulfillment",
    whRetry.status === 200 && db4.tables.coach_requests.length === 1 && evRow?.status === "processed" && (evRow?.attempt_count as number) === 2,
  );
  const whDup = await processWebhookEvent(db4.client, purchaseEvent("evt-4", "txn-2"), noopInvalidate);
  check("processed duplicate → 200, nothing created twice", whDup.status === 200 && whDup.body.duplicate === true && db4.tables.coach_requests.length === 1);

  console.log("\n— E2E: refunded transaction cannot fulfill —");
  const db5 = fakeDb({
    billing_events: [{ event_id: "evt-c", event_type: "CANCELLATION", app_user_id: U, transaction_id: "txn-2", status: "processed" }],
  });
  const whRefunded = await processWebhookEvent(db5.client, purchaseEvent("evt-5", "txn-2"), noopInvalidate);
  check("webhook: revoked txn → 200 processed, NO request", whRefunded.status === 200 && db5.tables.coach_requests.length === 0);
  const apiRefunded = await apiCall(db5, [purchases[1]]);
  check("API: all purchases refunded → 402 with refund reason", apiRefunded.httpStatus === 402 && /refunded/.test(apiRefunded.error ?? ""));

  console.log("\n— E2E: transaction owned by another account —");
  const db6 = fakeDb({
    coach_requests: [{ id: "r-other", user_id: OTHER, athlete_name: "B", service: "custom_plan", status: "active", purchase_transaction_id: "txn-2" }],
  });
  const apiOther = await apiCall(db6, purchases);
  check("another user's transaction → 409, never fulfilled", apiOther.httpStatus === 409 && db6.tables.coach_requests.length === 1);

  console.log("\n— executor mechanics (atomic promote, race resolve) —");
  const db7 = fakeDb({
    coach_requests: [{ id: "wl-9", user_id: U, athlete_name: "A", service: "custom_plan", status: "waitlist", purchase_transaction_id: null }],
  });
  const o4 = await executeFulfillment(db7.client, {
    userId: U,
    athleteName: "A",
    service: "custom_plan",
    decision: { action: "promote", waitlistId: "wl-9" },
    txnId: "txn-C",
    productId: "hybrid_custom_plan",
    purchasedAt: "2026-08-01T00:00:00Z",
  });
  const promoted = db7.tables.coach_requests.find((r) => r.id === "wl-9");
  check("waitlist promotes atomically with the txn stamped", o4.httpStatus === 200 && promoted?.status === "assessment_needed" && promoted?.purchase_transaction_id === "txn-C");
  const o5 = await executeFulfillment(db7.client, {
    userId: U,
    athleteName: "A",
    service: "custom_plan",
    decision: { action: "promote", waitlistId: "wl-9" },
    txnId: "txn-D",
    productId: null,
    purchasedAt: null,
  });
  check("re-promoting a non-waitlist row fails closed", o5.httpStatus === 500);

  console.log(`\ncoach-fulfillment-test: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
