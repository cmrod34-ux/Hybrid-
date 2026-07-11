import { createClient } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; userId: string | null }
  | { ok: false };

/**
 * Verifies the Supabase access token from the Authorization header.
 *
 * Rollout-safe: if SUPABASE_URL / SUPABASE_ANON_KEY are not configured on the
 * server yet, this runs in "open" mode (allows the request) so nothing breaks
 * before the env vars are added. Once both vars are set in Vercel, every
 * request must carry a valid Supabase user token or it is rejected.
 */
export async function verifyUser(authHeader: string | null): Promise<AuthResult> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // Not configured yet — open mode (same behavior as before lockdown).
  if (!url || !anonKey) {
    console.warn("[verifyUser] SUPABASE_URL/ANON_KEY not set — running in OPEN mode (no auth enforced)");
    return { ok: true, userId: null };
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { ok: false };

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { ok: false };
    return { ok: true, userId: data.user.id };
  } catch (e) {
    console.error("[verifyUser] error:", e instanceof Error ? e.message : String(e));
    return { ok: false };
  }
}

/**
 * Best-effort in-memory rate limiter. On serverless this is per-instance, so it
 * blunts bursts from a warm instance rather than being a hard global cap — pair
 * it with the auth requirement above. For a hard global limit at scale, move
 * this to a shared store (e.g. Upstash Redis).
 */
const hits = new Map<string, number[]>();

/** Sliding-window limiter with a configurable budget. Returns false when the
 *  key has exhausted `max` requests within `windowMs`. */
export function rateLimitWindow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Default limiter used by the plan/nutrition endpoints: 8 requests/minute. */
export function rateLimit(key: string): boolean {
  return rateLimitWindow(key, 8, 60_000);
}
