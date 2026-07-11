import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyUser, rateLimitWindow } from "@/lib/verifyUser";

// Authenticated coach endpoint for the mobile app. The unauthenticated
// website demo lives at /api/chat-demo with its own stricter limits.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

// Plan-aware coach persona for signed-in athletes. When the app includes a
// context block, answers are grounded in the athlete's actual plan.
const IN_APP_PROMPT = `You are the Hybrid AI coach inside the Hybrid training app, built for hybrid athletes: people who run AND lift, compete in HYROX, CrossFit, obstacle races, or just want to be strong and fast at the same time.

Give real, specific, useful advice about training, nutrition, and recovery for hybrid athletes. Be direct and confident. No fluff. Keep responses concise — 3 to 6 sentences max.

When athlete context is provided, ground answers in it: reference their actual plan week, phase, today's workout, race countdown, and recent session feedback. Questions like "why am I doing this workout", "can I move my long run", or "my legs are sore" should be answered against their real plan.

If they want to change their schedule, remind them they can move, swap, shorten, or skip sessions from the workout screen — and that Hybrid will propose plan adjustments they can accept or reject.

If someone asks something completely off-topic (politics, coding, etc.), politely redirect them back to training.`;

// 30 requests per hour per signed-in user.
const CHAT_LIMIT = 30;
const CHAT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Require a valid Supabase session — same pattern as the plan/nutrition
  // and Strava endpoints.
  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Please sign in to chat with your coach." }, { status: 401, headers: corsHeaders });
  }

  const rateKey = auth.userId ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimitWindow(`chat:${rateKey}`, CHAT_LIMIT, CHAT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "You've hit the hourly chat limit — give it a little while and try again." },
      { status: 429, headers: corsHeaders },
    );
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400, headers: corsHeaders });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[Chat] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "AI not configured" }, { status: 500, headers: corsHeaders });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const apiMessages = messages.slice(-10);

  // Optional compact plan-context block from the mobile app (capped, plain text).
  const context = typeof body?.context === "string" ? body.context.slice(0, 1500) : null;
  const system = context ? `${IN_APP_PROMPT}\n\nAthlete context:\n${context}` : IN_APP_PROMPT;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: apiMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text }, { headers: corsHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Chat] Claude API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
