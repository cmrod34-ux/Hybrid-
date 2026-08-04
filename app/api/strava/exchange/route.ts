import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/verifyUser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/**
 * Securely exchanges a Strava OAuth code (or refresh token) for access tokens.
 *
 * The Strava client secret lives only here on the server — it is never shipped
 * in the mobile app. The app sends either:
 *   { code }          — first-time authorization, returned from the OAuth flow
 *   { refresh_token }  — to refresh an expired access token
 *
 * Requires a valid Supabase user (same auth as the AI endpoints) so the Strava
 * app credentials can't be abused by anonymous callers.
 *
 * Configure in Vercel before use:
 *   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET  (from developer.strava.com)
 */
export async function POST(req: NextRequest) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return NextResponse.json({ error: "Strava is not configured." }, { status: 500, headers: corsHeaders });
  }

  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Please sign in to connect Strava." }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  if (!body || (!body.code && !body.refresh_token)) {
    return NextResponse.json({ error: "A code or refresh_token is required." }, { status: 400, headers: corsHeaders });
  }

  const params = new URLSearchParams();
  params.set("client_id", STRAVA_CLIENT_ID);
  params.set("client_secret", STRAVA_CLIENT_SECRET);
  if (body.refresh_token) {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", String(body.refresh_token));
  } else {
    params.set("grant_type", "authorization_code");
    params.set("code", String(body.code));
  }

  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[Strava] token exchange failed:", data);
      return NextResponse.json(
        { error: data?.message || "Strava token exchange failed." },
        { status: res.status, headers: corsHeaders },
      );
    }

    // Return only what the client needs to call the Strava API and refresh later.
    return NextResponse.json(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        athlete: data.athlete ?? null,
      },
      { headers: corsHeaders },
    );
  } catch (e: unknown) {
    console.error("[Strava] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: corsHeaders });
  }
}
