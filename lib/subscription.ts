// Server-side subscription verification — the TRUSTED source of paid status.
//
// The mobile client's plan state gates UI only. Anything that costs money
// server-side (AI calls, coaching requests) re-verifies here against
// RevenueCat's REST API using the SECRET key (server env only, never shipped
// to a client). A user editing client state can never unlock paid server
// functionality.
//
// ROLLOUT-SAFE: until REVENUECAT_SECRET_KEY is configured, results report
// "unconfigured" and callers keep pre-subscription behavior. Once configured,
// a provider ERROR fails toward the FREE tier — an outage must never grant
// higher limits or paid features.

export type ServerPlan = "free" | "pro" | "unknown";

export interface VerifiedEntitlements {
  status: "ok" | "unconfigured" | "error";
  /** Active entitlement ids (e.g. "pro", "pro_plus", "coaching"). */
  active: ReadonlySet<string>;
  /** One-time (non-subscription) product ids ever purchased (e.g. the
   *  custom-plan product) — RevenueCat lists these separately. */
  oneTimeProducts: ReadonlySet<string>;
}

interface CacheEntry {
  ents: VerifiedEntitlements;
  at: number;
}

// Per-instance cache — subscription state rarely changes; 5 minutes keeps
// RevenueCat traffic negligible without meaningfully delaying upgrades.
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 5 * 60 * 1000;

const EMPTY: ReadonlySet<string> = new Set();

/** Entitlement-level verification for a Supabase user id. Distinguishes the
 *  individual entitlements — "coaching" is not "pro". */
export async function verifiedEntitlements(userId: string | null): Promise<VerifiedEntitlements> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key || !userId) return { status: "unconfigured", active: EMPTY, oneTimeProducts: EMPTY };

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ents;

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { status: "error", active: EMPTY, oneTimeProducts: EMPTY };
    const data = (await res.json()) as {
      subscriber?: {
        entitlements?: Record<string, { expires_date: string | null }>;
        non_subscriptions?: Record<string, unknown[]>;
      };
    };
    const active = new Set<string>();
    for (const [id, e] of Object.entries(data.subscriber?.entitlements ?? {})) {
      if (e.expires_date === null || Date.parse(e.expires_date) > Date.now()) active.add(id);
    }
    const oneTime = new Set<string>();
    for (const [productId, purchases] of Object.entries(data.subscriber?.non_subscriptions ?? {})) {
      if (Array.isArray(purchases) && purchases.length > 0) oneTime.add(productId);
    }
    const ents: VerifiedEntitlements = { status: "ok", active, oneTimeProducts: oneTime };
    cache.set(userId, { ents, at: Date.now() });
    return ents;
  } catch {
    return { status: "error", active: EMPTY, oneTimeProducts: EMPTY };
  }
}

/** Coarse plan for rate-limit tiers. Any active entitlement grants paid chat
 *  limits (coaching subscribers get at least Pro's). Provider ERRORS return
 *  "free" — never a higher limit than an unpaid user. "unknown" appears only
 *  while the provider is UNCONFIGURED (pre-launch rollout). */
export async function verifiedPlan(userId: string | null): Promise<ServerPlan> {
  const ents = await verifiedEntitlements(userId);
  if (ents.status === "unconfigured") return "unknown";
  if (ents.status === "error") return "free";
  return ents.active.size > 0 ? "pro" : "free";
}

/** Drop a user's cached state (called by the RevenueCat webhook so upgrades,
 *  cancellations, and refunds take effect immediately). */
export function invalidateSubscriptionCache(userId: string): void {
  cache.delete(userId);
}

/** Chat limits per verified plan. "unknown" (provider not configured yet)
 *  keeps the pre-subscription behavior so nothing regresses at rollout. */
export function chatLimitFor(plan: ServerPlan): { max: number; windowMs: number } {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  switch (plan) {
    case "pro":
      return { max: 100, windowMs: DAY }; // generous, still abuse-bounded
    case "free":
      return { max: 10, windowMs: DAY }; // mirrors PRICING.freeLimits client-side
    default:
      return { max: 30, windowMs: HOUR }; // legacy limit until provider config
  }
}
