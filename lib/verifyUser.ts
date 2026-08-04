import { createClient } from "@supabase/supabase-js";

export type AuthResult =
  | {
      ok: true;
      userId: string | null;
      /** Server-granted internal role from Supabase app_metadata.hybrid_role
       *  ("developer" | "admin" | null). app_metadata is only writable with
       *  the service-role key — never by the client — so this value is
       *  trustworthy for server-side entitlement decisions. */
      role: string | null;
    }
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

  if (!url || !anonKey) {
    // FAIL CLOSED in production: a misconfigured deployment must never expose
    // authenticated endpoints (AI spend, Strava credentials) to anonymous
    // callers. Open mode survives only for local development.
    if (process.env.NODE_ENV === "production") {
      console.error("[verifyUser] SUPABASE_URL/ANON_KEY not set in production — rejecting request (fail closed)");
      return { ok: false };
    }
    console.warn("[verifyUser] SUPABASE_URL/ANON_KEY not set — DEV open mode (no auth enforced)");
    return { ok: true, userId: null, role: null };
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { ok: false };

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { ok: false };
    const meta = (data.user.app_metadata ?? {}) as Record<string, unknown>;
    const role = typeof meta.hybrid_role === "string" ? meta.hybrid_role : null;
    return { ok: true, userId: data.user.id, role };
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

/* ── Shared input validation / sanitization ── */

/** Hard caps for AI chat payloads — bounds token spend per request. */
export const MAX_CHAT_MESSAGES = 10;
export const MAX_CHAT_MESSAGE_CHARS = 4000;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Strictly validate a client-supplied chat transcript. Only plain-text
 * user/assistant turns survive: no content-block arrays (image parts would be
 * an API-cost hole), no extra roles, no oversized messages. Returns null when
 * the payload isn't salvageable.
 */
export function sanitizeChatMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_CHAT_MESSAGES)) {
    if (!m || typeof m !== "object") return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length === 0) return null;
    out.push({ role, content: content.slice(0, MAX_CHAT_MESSAGE_CHARS) });
  }
  // The API requires the transcript to end on a user turn.
  if (out.length === 0 || out[out.length - 1].role !== "user") return null;
  return out;
}

/** Trim + cap a free-text field from the client (drops control chars). */
export function capString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

/** Escape a string for interpolation into HTML (notification emails). */
export function escapeHtml(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Neutralize spreadsheet formula injection for values written to Sheets
 *  (defense in depth alongside valueInputOption: RAW). */
export function sheetSafe(v: string): string {
  return /^[=+\-@\t]/.test(v) ? `'${v}` : v;
}
