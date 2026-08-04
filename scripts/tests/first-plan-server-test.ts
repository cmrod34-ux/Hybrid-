// First-plan server logic — REAL execution tests (no source-text matching).
// Run: npm test  (tsx scripts/tests/first-plan-server-test.ts)
//
// These tests execute the exact pure functions the deployed route calls
// (lib/firstPlanServer.ts). What they do NOT cover: Supabase I/O and HTTP
// auth, which are exercised by the production curl checks (401/503/204).

import {
  applyPlanEvent,
  buildServerRecord,
  deriveStatus,
  parsePlanEvent,
  parseStoredRecord,
  GRACE_DAYS,
  MAX_PLAN_DAYS,
  MIN_PLAN_DAYS,
  type FirstPlanRecord,
} from "../../lib/firstPlanServer";

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

const NOW = new Date("2026-08-04T12:00:00.000Z");
const DAY = 86_400_000;

console.log("\n— parsePlanEvent: client input is minimum-trust —");

// Far-future client dates (legacy body): duration explodes past the legit range → rejected.
check(
  "far-future endsAt rejected",
  parsePlanEvent({ record: { planId: "p1", startedAt: "2026-08-04T00:00:00Z", endsAt: "2099-01-01" } }) === null
);
// Far-past startedAt inflating duration → rejected.
check(
  "far-past startedAt rejected",
  parsePlanEvent({ record: { planId: "p1", startedAt: "2000-01-01T00:00:00Z", endsAt: "2026-10-01" } }) === null
);
// Invalid dates → rejected.
check(
  "unparseable startedAt rejected",
  parsePlanEvent({ record: { planId: "p1", startedAt: "not-a-date", endsAt: "2026-10-01" } }) === null
);
check(
  "unparseable endsAt rejected",
  parsePlanEvent({ record: { planId: "p1", startedAt: "2026-08-04T00:00:00Z", endsAt: "soon" } }) === null
);
// Negative / zero / excessive / fractional duration → rejected.
check("negative duration rejected", parsePlanEvent({ planId: "p1", durationDays: -5 }) === null);
check("zero duration rejected", parsePlanEvent({ planId: "p1", durationDays: 0 }) === null);
check("sub-minimum duration rejected", parsePlanEvent({ planId: "p1", durationDays: MIN_PLAN_DAYS - 1 }) === null);
check("excessive duration rejected", parsePlanEvent({ planId: "p1", durationDays: MAX_PLAN_DAYS + 1 }) === null);
check("fractional duration rejected", parsePlanEvent({ planId: "p1", durationDays: 83.5 }) === null);
check("NaN duration rejected", parsePlanEvent({ planId: "p1", durationDays: Number.NaN }) === null);
check("Infinity duration rejected", parsePlanEvent({ planId: "p1", durationDays: Infinity }) === null);
// Bounds accepted.
check("minimum duration accepted", parsePlanEvent({ planId: "p1", durationDays: MIN_PLAN_DAYS })?.durationDays === MIN_PLAN_DAYS);
check("maximum duration accepted", parsePlanEvent({ planId: "p1", durationDays: MAX_PLAN_DAYS })?.durationDays === MAX_PLAN_DAYS);
// Legacy body with a legitimate 12-week window still parses (route compatibility).
const legacy = parsePlanEvent({
  record: { planId: "legacy-1", startedAt: "2026-08-04T09:00:00Z", endsAt: "2026-10-27", status: "active", replacementsUsed: 0 },
});
check("legacy 12-week body accepted", legacy !== null && legacy.durationDays === 84, JSON.stringify(legacy));
// Garbage shapes.
check("empty body rejected", parsePlanEvent(null) === null && parsePlanEvent({}) === null);
check("missing planId rejected", parsePlanEvent({ durationDays: 84 }) === null);

console.log("\n— server generates dates; forged fields never reach the record —");

const granted = buildServerRecord({ planId: "p1", durationDays: 84 }, NOW, 0);
check("startedAt is the server clock", granted.startedAt === NOW.toISOString());
check(
  "endsAt = server now + duration",
  granted.endsAt === new Date(NOW.getTime() + 84 * DAY).toISOString().slice(0, 10),
  granted.endsAt
);
check("grant starts active with 0 replacements", granted.status === "active" && granted.replacementsUsed === 0);

// Forged status/count in a legacy body: parse only extracts planId+duration,
// so applyPlanEvent literally cannot see them.
const forgedParse = parsePlanEvent({
  record: { planId: "p2", startedAt: "2026-08-04T00:00:00Z", endsAt: "2026-10-27", status: "expired", replacementsUsed: -50 },
});
check(
  "forged status/replacements stripped at parse",
  forgedParse !== null && Object.keys(forgedParse).sort().join(",") === "durationDays,planId"
);

console.log("\n— applyPlanEvent: write-once, grace, replay —");

// First grant.
const g1 = applyPlanEvent(null, { planId: "A", durationDays: 84 }, NOW);
check("first event grants", g1.changed && g1.next.planId === "A" && g1.next.status === "active");

// Replay of the same request (same planId) → idempotent no-op.
const replay = applyPlanEvent(g1.next, { planId: "A", durationDays: 140 }, new Date(NOW.getTime() + 60_000));
check("replayed request is a no-op", !replay.changed && replay.next.endsAt === g1.next.endsAt);

// Grace replacement inside window (server-written startedAt is the anchor).
const g2 = applyPlanEvent(g1.next, { planId: "B", durationDays: 56 }, new Date(NOW.getTime() + 2 * DAY));
check("grace replacement consumes a slot", g2.changed && g2.next.planId === "B" && g2.next.replacementsUsed === 1);

// Second replacement → replacements spent → record stands.
const g3 = applyPlanEvent(g2.next, { planId: "C", durationDays: 84 }, new Date(NOW.getTime() + 3 * DAY));
check("second replacement refused", !g3.changed && g3.next.planId === "B");

// Outside the grace window (computed from SERVER startedAt) → refused.
const lateBase = buildServerRecord({ planId: "A", durationDays: 84 }, NOW, 0);
const late = applyPlanEvent(lateBase, { planId: "B", durationDays: 84 }, new Date(NOW.getTime() + (GRACE_DAYS + 1) * DAY));
check("replacement after grace window refused", !late.changed || late.next.planId === "A");

// Reinstall / cleared local storage: server record completed, fresh client
// pushes a brand-new plan → no second free plan.
const completed: FirstPlanRecord = { ...lateBase, status: "completed" };
const reinstall = applyPlanEvent(completed, { planId: "fresh-install-plan", durationDays: 84 }, new Date(NOW.getTime() + 100 * DAY));
check("reinstall cannot mint a second grant", !reinstall.changed && reinstall.next.planId === "A" && reinstall.next.status === "completed");

// Simultaneous requests from one base state (the route serializes per user;
// this asserts the WORST-CASE outcome if both were applied in sequence):
const s1 = applyPlanEvent(null, { planId: "X", durationDays: 84 }, NOW);
const s2 = applyPlanEvent(s1.next, { planId: "Y", durationDays: 84 }, new Date(NOW.getTime() + 1000));
const s3 = applyPlanEvent(s2.next, { planId: "Z", durationDays: 84 }, new Date(NOW.getTime() + 2000));
check(
  "burst of distinct plans is bounded by grace slots",
  s2.next.replacementsUsed === 1 && !s3.changed && s3.next.planId === "Y"
);

// Status derives forward, never backward.
const past = deriveStatus(buildServerRecord({ planId: "A", durationDays: 7 }, NOW, 0), new Date(NOW.getTime() + 8 * DAY));
check("active derives to completed after endsAt", past.status === "completed");
const stillCompleted = deriveStatus(past, NOW);
check("completed never derives back to active", stillCompleted.status === "completed");

console.log("\n— parseStoredRecord defensive parsing —");
check("stored garbage rejected", parseStoredRecord({ planId: 5 }) === null);
check("stored invalid dates rejected", parseStoredRecord({ planId: "a", startedAt: "x", endsAt: "y", status: "active" }) === null);
check(
  "stored negative count clamped",
  parseStoredRecord({ planId: "a", startedAt: NOW.toISOString(), endsAt: "2026-10-27", status: "active", replacementsUsed: -3 })?.replacementsUsed === 0
);

console.log(`\nfirst-plan-server-test: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
