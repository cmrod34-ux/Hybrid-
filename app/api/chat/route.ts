import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

const SYSTEM_PROMPT = `You are the Hybrid AI coach — a preview of the AI inside the Hybrid training app. Hybrid is built for hybrid athletes: people who run AND lift, compete in HYROX, CrossFit, obstacle races, or just want to be strong and fast at the same time.

Your job is to give real, specific, useful advice about training, nutrition, and recovery for hybrid athletes. Be direct and confident. No fluff.

Keep responses concise — 3 to 6 sentences max. This is a preview chat, not a full coaching session.

Occasionally (but not every message) mention what the full Hybrid app would do — like building a full personalized plan, syncing with their Garmin, or tracking week-by-week progress. Make it feel like a natural tease, not a sales pitch.

Topics you know well:
- Balancing running volume with strength training
- HYROX and hybrid race preparation
- Periodization for hybrid athletes
- Nutrition for athletes who both run and lift
- Recovery, sleep, and managing fatigue
- How to structure a training week
- Common mistakes hybrid athletes make

If someone asks something completely off-topic (politics, coding, etc.), politely redirect them back to training.`;

// Used when the request carries the athlete's plan context (the mobile app's
// in-app coach) — same expertise, but plan-aware and no marketing tease.
const IN_APP_PROMPT = `You are the Hybrid AI coach inside the Hybrid training app. The athlete has a structured multi-week plan that Hybrid generated, and their current context is provided below.

Give real, specific, useful advice about training, nutrition, and recovery for hybrid athletes. Be direct and confident. No fluff. Keep responses concise — 3 to 6 sentences max.

Ground answers in their context: reference their actual plan week, phase, today's workout, race countdown, and recent session feedback when relevant. Questions like "why am I doing this workout", "can I move my long run", or "my legs are sore" should be answered against their real plan.

If they want to change their schedule, remind them they can move, swap, shorten, or skip sessions from the workout screen — and that Hybrid will propose plan adjustments they can accept or reject.

If someone asks something completely off-topic (politics, coding, etc.), politely redirect them back to training.`;

export async function POST(req: NextRequest) {
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
  const system = context ? `${IN_APP_PROMPT}\n\nAthlete context:\n${context}` : SYSTEM_PROMPT;

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
