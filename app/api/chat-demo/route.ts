import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimitWindow, sanitizeChatMessages } from "@/lib/verifyUser";

// Unauthenticated AI demo for the hybridfit.org landing page. Deliberately
// stricter than the app's /api/chat: per-IP limited, no plan context, and
// the preview persona only.

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

// 10 demo messages per IP per 10 minutes — enough to try it, hard to abuse.
const DEMO_LIMIT = 10;
const DEMO_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimitWindow(`chat-demo:${ip}`, DEMO_LIMIT, DEMO_WINDOW_MS)) {
    return NextResponse.json(
      { reply: "You've reached the demo limit for now — join the waitlist to get the full Hybrid coach when we launch!" },
      { status: 200 },
    );
  }

  const body = await req.json().catch(() => null);
  // Strict shape + size validation (plain text only, capped per message).
  const messages = sanitizeChatMessages(body?.messages);
  if (!messages) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ChatDemo] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });
  } catch (e: unknown) {
    console.error("[ChatDemo] Claude API error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
