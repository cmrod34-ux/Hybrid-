import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messages = body?.messages;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: messages.slice(-10), // keep last 10 messages for context
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply: text });
}
