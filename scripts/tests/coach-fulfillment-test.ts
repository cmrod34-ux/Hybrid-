// Paid-request fulfillment — REAL execution tests over the decision logic
// and the executor, using an in-memory database that enforces the same
// UNIQUE purchase_transaction_id constraint the real migration creates.
// (The live-database version of the constraint is exercised by the app
// repo's rls-integration-test.ts once migrations are applied.)

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decideFulfillment,
  executeFulfillment,
  pickCustomPlanTransaction,
  type ExistingRequest,
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

/* ── fake Supabase: just the chains executeFulfillment uses, with the
      unique-transaction constraint enforced like the real index ── */

interface Row {
  id: string;
  user_id: string;
  athlete_name: string;
  service: string;
  status: string;
  purchase_transaction_id: string | null;
  [k: string]: unknown;
}

function fakeDb(seed: Row[] = []) {
  const rows: Row[] = seed.map((r) => ({ ...r }));
  let nextId = 1000;
  const txnTaken = (txn: string, exceptId?: string) =>
    rows.some((r) => r.purchase_transaction_id === txn && r.id !== exceptId);

  function from() {
    const filters: Array<[string, unknown]> = [];
    let op: "select" | "insert" | "update" = "select";
    let payload: Record<string, unknown> = {};
    const api = {
      select() {
        return api;
      },
      insert(obj: Record<string, unknown>) {
        op = "insert";
        payload = obj;
        return api;
      },
      update(obj: Record<string, unknown>) {
        op = "update";
        payload = obj;
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return api;
      },
      async single(): Promise<{ data: Row | null; error: { code?: string; message: string } | null }> {
        if (op === "insert") {
          const txn = payload.purchase_transaction_id as string | null | undefined;
          if (txn && txnTaken(txn)) return { data: null, error: { code: "23505", message: "duplicate key" } };
          const row = { id: `r${nextId++}`, purchase_transaction_id: null, ...payload } as Row;
          rows.push(row);
          return { data: row, error: null };
        }
        if (op === "update") {
          const target = rows.find((r) => filters.every(([c, v]) => r[c] === v));
          if (!target) return { data: null, error: { message: "0 rows" } };
          const txn = payload.purchase_transaction_id as string | null | undefined;
          if (txn && txnTaken(txn, target.id)) return { data: null, error: { code: "23505", message: "duplicate key" } };
          Object.assign(target, payload);
          return { data: target, error: null };
        }
        const found = rows.find((r) => filters.every(([c, v]) => r[c] === v));
        return found ? { data: found, error: null } : { data: null, error: { message: "not found" } };
      },
    };
    return api;
  }
  return { client: { from: () => from() } as unknown as SupabaseClient, rows };
}

const U = "user-a";
const runExec = (
  db: ReturnType<typeof fakeDb>,
  opts: Partial<Parameters<typeof executeFulfillment>[1]> & { decision: Parameters<typeof executeFulfillment>[1]["decision"] },
) =>
  executeFulfillment(db.client, {
    userId: U,
    athleteName: "A",
    service: "custom_plan",
    txnId: null,
    productId: null,
    purchasedAt: null,
    ...opts,
  });

(async () => {
  console.log("\n— pickCustomPlanTransaction: valid, refunded, consumed, wrong product —");
  const purchases = [
    { id: "txn-1", purchase_date: "2026-08-01T10:00:00Z" },
    { id: "txn-2", purchase_date: "2026-08-03T10:00:00Z" },
  ];
  check(
    "valid new purchase picks the newest unused transaction",
    pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set(), usedTxnIds: new Set() }).txn?.id === "txn-2",
  );
  check(
    "refunded transaction never fulfills",
    pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set(["txn-2"]), usedTxnIds: new Set() }).txn?.id === "txn-1",
  );
  const allGone = pickCustomPlanTransaction({ purchases, revokedTxnIds: new Set(["txn-1"]), usedTxnIds: new Set(["txn-2"]) });
  check("all transactions consumed/revoked → none picked, hadPurchase true", allGone.txn === null && allGone.hadPurchase);
  const wrongProduct = pickCustomPlanTransaction({ purchases: [], revokedTxnIds: new Set(), usedTxnIds: new Set() });
  check("wrong/no product → no transaction, hadPurchase false", wrongProduct.txn === null && !wrongProduct.hadPurchase);

  console.log("\n— decideFulfillment: reuse, promote, conflict, reject —");
  const completedWithTxn: ExistingRequest[] = [
    { id: "req-1", service: "custom_plan", status: "completed", purchase_transaction_id: "txn-1" },
  ];
  const d1 = decideFulfillment({ service: "custom_plan", requests: completedWithTxn, txnId: "txn-1", hasCoachingEntitlement: false });
  check("replay of a fulfilled transaction reuses the SAME request", d1.action === "reuse" && (d1 as { requestId: string }).requestId === "req-1");

  const d2 = decideFulfillment({ service: "custom_plan", requests: completedWithTxn, txnId: null, hasCoachingEntitlement: false, allTransactionsConsumed: true });
  check("completed request + reuse attempt → honest 'already used' rejection", d2.action === "reject" && /already been used/.test((d2 as { reason: string }).reason));

  const d3 = decideFulfillment({ service: "custom_plan", requests: [], txnId: null, hasCoachingEntitlement: false });
  check("no purchase at all → rejection", d3.action === "reject" && /No verified/.test((d3 as { reason: string }).reason));

  const waitlistSame: ExistingRequest[] = [{ id: "wl-1", service: "custom_plan", status: "waitlist", purchase_transaction_id: null }];
  const d4 = decideFulfillment({ service: "custom_plan", requests: waitlistSame, txnId: "txn-9", hasCoachingEntitlement: false });
  check("same-service waitlist promotes", d4.action === "promote" && (d4 as { waitlistId: string }).waitlistId === "wl-1");

  const waitlistOther: ExistingRequest[] = [{ id: "wl-2", service: "coaching", status: "waitlist", purchase_transaction_id: null }];
  const d5 = decideFulfillment({ service: "custom_plan", requests: waitlistOther, txnId: "txn-9", hasCoachingEntitlement: false });
  check("different-service waitlist is NOT promoted or returned — new request created", d5.action === "create");

  const activeCoaching: ExistingRequest[] = [{ id: "co-1", service: "coaching", status: "active", purchase_transaction_id: null }];
  const d6 = decideFulfillment({ service: "custom_plan", requests: activeCoaching, txnId: "txn-9", hasCoachingEntitlement: false });
  check("open paid request for the OTHER service → explained conflict (409)", d6.action === "conflict" && /coaching/.test((d6 as { reason: string }).reason));

  const d7 = decideFulfillment({ service: "coaching", requests: activeCoaching, txnId: null, hasCoachingEntitlement: true });
  check("existing open coaching request + active sub → reuse, never duplicate", d7.action === "reuse" && (d7 as { requestId: string }).requestId === "co-1");

  const d8 = decideFulfillment({ service: "coaching", requests: [], txnId: null, hasCoachingEntitlement: false });
  check("coaching without entitlement → rejection", d8.action === "reject");

  console.log("\n— executeFulfillment against the constraint-enforcing fake DB —");
  // Valid new purchase.
  const db1 = fakeDb();
  const o1 = await runExec(db1, { decision: { action: "create" }, txnId: "txn-A", productId: "hybrid_custom_plan", purchasedAt: "2026-08-01T00:00:00Z" });
  check("create stamps the transaction and returns 200", o1.httpStatus === 200 && (o1.request as Row).purchase_transaction_id === "txn-A");
  check("exactly one row exists", db1.rows.length === 1);

  // Duplicate delivery / replayed webhook: second create on the same txn hits
  // the unique constraint and resolves to the SAME request.
  const o2 = await runExec(db1, { decision: { action: "create" }, txnId: "txn-A" });
  check("duplicate delivery returns the same request (existing=true)", o2.httpStatus === 200 && o2.existing === true && (o2.request as Row).id === (o1.request as Row).id);
  check("no duplicate row was created", db1.rows.length === 1);

  // Purchase owned by another user: txn already attached to someone else.
  const db2 = fakeDb([{ id: "r-b", user_id: "user-B", athlete_name: "B", service: "custom_plan", status: "active", purchase_transaction_id: "txn-B" }]);
  const o3 = await runExec(db2, { decision: { action: "create" }, txnId: "txn-B" });
  check("another user's transaction → 409, never fulfilled", o3.httpStatus === 409 && /another account/.test(o3.error ?? ""));

  // Same-service waitlist promotion is atomic (status guard).
  const db3 = fakeDb([{ id: "wl-9", user_id: U, athlete_name: "A", service: "custom_plan", status: "waitlist", purchase_transaction_id: null }]);
  const o4 = await runExec(db3, { decision: { action: "promote", waitlistId: "wl-9" }, txnId: "txn-C", productId: "hybrid_custom_plan" });
  const promoted = db3.rows.find((r) => r.id === "wl-9");
  check("waitlist promotes to assessment_needed with the txn stamped", o4.httpStatus === 200 && promoted?.status === "assessment_needed" && promoted?.purchase_transaction_id === "txn-C");
  const o5 = await runExec(db3, { decision: { action: "promote", waitlistId: "wl-9" }, txnId: "txn-D" });
  check("re-promoting a non-waitlist row fails closed (atomic guard)", o5.httpStatus === 500);

  // Simultaneous requests: two creates race on one transaction.
  const db4 = fakeDb();
  const [s1, s2] = [
    await runExec(db4, { decision: { action: "create" }, txnId: "txn-E" }),
    await runExec(db4, { decision: { action: "create" }, txnId: "txn-E" }),
  ];
  check(
    "simultaneous fulfillment: one row, both callers get the same request",
    db4.rows.length === 1 && s1.httpStatus === 200 && s2.httpStatus === 200 && (s1.request as Row).id === (s2.request as Row).id,
  );

  // Reject/conflict pass straight through with the right statuses.
  const o6 = await runExec(fakeDb(), { decision: { action: "reject", reason: "no purchase" } });
  const o7 = await runExec(fakeDb(), { decision: { action: "conflict", reason: "busy" } });
  check("reject → 402, conflict → 409", o6.httpStatus === 402 && o7.httpStatus === 409);

  console.log(`\ncoach-fulfillment-test: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
