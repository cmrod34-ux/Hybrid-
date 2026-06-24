import { NextRequest, NextResponse } from "next/server";
import { verifyUser, rateLimit } from "@/lib/verifyUser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/**
 * Fetches the signed-in athlete's recent Strava activities.
 *
 * Proxied through the backend so it works from the web build too (the Strava
 * API doesn't send browser CORS headers). The client passes its Strava
 * access_token; we never see the client secret here.
 *
 * Body: { access_token: string, after?: number (unix seconds), perPage?: number }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: corsHeaders });
  }
  if (!rateLimit((auth.userId ?? "anon") + ":strava")) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  const accessToken = body?.access_token;
  if (!accessToken) {
    return NextResponse.json({ error: "Missing Strava access token." }, { status: 400, headers: corsHeaders });
  }

  const perPage = Math.min(Number(body?.perPage) || 30, 100);
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (body?.after) params.set("after", String(body.after));

  try {
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[Strava] activities fetch failed:", data);
      return NextResponse.json(
        { error: data?.message || "Failed to fetch Strava activities." },
        { status: res.status, headers: corsHeaders },
      );
    }

    // Return a slim, stable shape — only the fields the app needs.
    const activities = (Array.isArray(data) ? data : []).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.sport_type ?? a.type,
      distanceMeters: a.distance,
      startDateLocal: a.start_date_local,
      movingTime: a.moving_time,
    }));

    return NextResponse.json({ activities }, { headers: corsHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Strava] activities error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
