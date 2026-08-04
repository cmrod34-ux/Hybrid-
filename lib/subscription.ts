// Server-side subscription verification — the TRUSTED source of paid status.
//
// The mobile client's plan state gates UI only. Anything that costs money
// server-side (AI calls) re-verifies here against RevenueCat's REST API using
// the SECRET key (server env only, never shipped to a client). A user editing
// client state can never unlock paid server functionality.
//
// ROLLOUT-SAFE: until REVENUECAT_SECRET_KEY is configured, plan() returns
// "unknown" and callers keep today's behavior (single shared limit for all
// authenticated users) — nothing breaks before the provider is set up.

export type ServerPlan = "free" | "pro" | "unknown";

interface CacheEntry {
  plan: ServerPlan;
  at: number;
}

// Per-instance cache — subscription state rarely changes; 5 minutes keeps
// RevenueCat traffic negligible without meaningfully delaying upgrades.
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 5 * 60 * 1000;

/** Look up the verified plan for a Supabase user id. */
export async function verifiedPlan(userId: string | null): Promise<ServerPlan> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key || !userId) return "unknown";

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.plan;

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      // RevenueCat creates the subscriber on first read; treat any failure as
      // free-tier (fail toward the cheaper limit, never toward free money).
    });
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { subscriber?: { entitlements?: Record<string, { expires_date: string | null }> } };
    const ents = data.subscriber?.entitlements ?? {};
    const active = Object.entries(ents).some(([, e]) => e.expires_date === null || Date.parse(e.expires_date) > Date.now());
    const plan: ServerPlan = active ? "pro" : "free";
    cache.set(userId, { plan, at: Date.now() });
    return plan;
  } catch {
    return "unknown";
  }
}

/** Drop a user's cached plan (called by the RevenueCat webhook so upgrades,
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
