// First-free-plan server rules — pure, unit-testable, no I/O.
//
// TRUST MODEL: the client is never the authority for time. A request tells the
// server "a plan with this id and this many days was created"; the server
// generates startedAt/endsAt from its own clock, clamps the duration to the
// range the plan generator can legitimately produce, and computes replacement
// eligibility exclusively from the timestamps it wrote earlier. Client-sent
// status, startedAt, endsAt, and replacementsUsed are ignored outright.

export const GRACE_DAYS = 7;
export const GRACE_REPLACEMENTS = 1;

// The plan generator produces 1–20-week plans (weeksUntil clamps to 20,
// default 12), so a legitimate first-plan window is 7–140 days.
export const MIN_PLAN_DAYS = 7;
export const MAX_PLAN_DAYS = 140;

const DAY_MS = 86_400_000;

export interface FirstPlanRecord {
  status: "active" | "completed" | "expired" | "replaced";
  planId: string;
  startedAt: string; // full ISO — written by the SERVER
  endsAt: string; // YYYY-MM-DD — written by the SERVER
  replacementsUsed: number;
}

/** What a client is allowed to tell us: which plan, and how long it runs. */
export interface PlanEventRequest {
  planId: string;
  durationDays: number;
}

/** Parse a record previously stored in app_metadata (server-written, but
 *  validate defensively anyway). */
export function parseStoredRecord(raw: unknown): FirstPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.planId !== "string" || typeof r.endsAt !== "string" || typeof r.startedAt !== "string") return null;
  const status = r.status;
  if (status !== "active" && status !== "completed" && status !== "expired" && status !== "replaced") return null;
  if (!Number.isFinite(Date.parse(r.startedAt)) || !Number.isFinite(Date.parse(r.endsAt))) return null;
  return {
    status,
    planId: r.planId.slice(0, 64),
    startedAt: r.startedAt.slice(0, 32),
    endsAt: r.endsAt.slice(0, 10),
    replacementsUsed: typeof r.replacementsUsed === "number" ? Math.max(0, Math.min(99, r.replacementsUsed)) : 0,
  };
}

/**
 * Parse a POST body into the minimum-trust request shape.
 *
 * Accepted forms:
 *  - `{ planId, durationDays }` — the current client contract.
 *  - `{ record: { planId, startedAt, endsAt } }` — the legacy body; only the
 *    planId and the DIFFERENCE between its dates survive (as a duration), and
 *    both dates must parse. The dates themselves are never stored.
 *
 * Returns null (→ 400) for missing/invalid planId, unparseable dates, or a
 * non-integer / out-of-range duration. Rejecting rather than clamping means a
 * forged far-future `endsAt` fails loudly instead of silently becoming a
 * 20-week grant.
 */
export function parsePlanEvent(body: unknown): PlanEventRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  let planId: unknown;
  let durationDays: number;

  if (typeof b.planId === "string" && b.planId.length > 0) {
    planId = b.planId;
    if (typeof b.durationDays !== "number") return null;
    durationDays = b.durationDays;
  } else if (b.record && typeof b.record === "object") {
    const r = b.record as Record<string, unknown>;
    if (typeof r.planId !== "string" || r.planId.length === 0) return null;
    if (typeof r.startedAt !== "string" || typeof r.endsAt !== "string") return null;
    const start = Date.parse(r.startedAt);
    const end = Date.parse(r.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    planId = r.planId;
    durationDays = Math.round((end - start) / DAY_MS);
  } else {
    return null;
  }

  if (!Number.isInteger(durationDays)) return null;
  if (durationDays < MIN_PLAN_DAYS || durationDays > MAX_PLAN_DAYS) return null;
  return { planId: (planId as string).slice(0, 64), durationDays };
}

/** Build a fresh record with SERVER-generated dates. */
export function buildServerRecord(event: PlanEventRequest, now: Date, replacementsUsed: number): FirstPlanRecord {
  return {
    status: "active",
    planId: event.planId,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + event.durationDays * DAY_MS).toISOString().slice(0, 10),
    replacementsUsed,
  };
}

/** Freshen a stored record's status against the server clock (active → completed). */
export function deriveStatus(record: FirstPlanRecord, now: Date): FirstPlanRecord {
  if (record.status !== "active") return record;
  const today = now.toISOString().slice(0, 10);
  return today >= record.endsAt ? { ...record, status: "completed" } : record;
}

/**
 * Apply a plan-creation event against the stored record. Pure — the route
 * supplies (existing, event, now) and persists `next` when `changed`.
 *
 *  - No record yet → first grant, server dates, zero replacements.
 *  - Same planId while active → idempotent no-op (replay-safe).
 *  - Different planId while active, inside the grace window computed from the
 *    SERVER-written startedAt, with replacements remaining → grace
 *    replacement (consumes a slot, restarts the window).
 *  - Anything else → the stored record stands (status may derive forward).
 */
export function applyPlanEvent(
  existing: FirstPlanRecord | null,
  event: PlanEventRequest,
  now: Date
): { next: FirstPlanRecord; changed: boolean } {
  if (!existing) {
    return { next: buildServerRecord(event, now, 0), changed: true };
  }
  const current = deriveStatus(existing, now);
  const withinGrace =
    now.getTime() <= Date.parse(current.startedAt) + GRACE_DAYS * DAY_MS &&
    current.replacementsUsed < GRACE_REPLACEMENTS;
  if (current.status === "active" && current.planId !== event.planId && withinGrace) {
    return { next: buildServerRecord(event, now, current.replacementsUsed + 1), changed: true };
  }
  const statusMoved = current.status !== existing.status;
  return { next: current, changed: statusMoved };
}
