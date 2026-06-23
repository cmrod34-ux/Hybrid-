import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are the Hybrid AI coach. Generate a personalized weekly training plan based on the athlete's profile.

Output ONLY valid JSON with this exact structure — no markdown, no explanation, no backticks:
{
  "summary": "1-2 sentence overview of the plan philosophy",
  "days": [
    {
      "day": "Monday",
      "type": "strength" | "run" | "hybrid" | "recovery" | "rest",
      "title": "Short workout title",
      "description": "2-3 sentence description of what to do",
      "duration": "45 min",
      "intensity": "high" | "moderate" | "low"
    }
  ]
}

Rules:
- Always include all 7 days (Monday through Sunday)
- Balance running and strength based on their goals
- Include at least 1 rest or active recovery day
- Make it specific and actionable, not generic
- Adjust intensity and volume to their experience level
- If they have a race/event, periodize toward it`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { athlete_type, goal, experience, runs_per_week, lifts_per_week, event_name, event_date, available_time } = body;

  const userPrompt = `Generate a weekly training plan for this athlete:
- Type: ${athlete_type || "Hybrid athlete"}
- Primary goal: ${goal || "General fitness"}
- Experience level: ${experience || "Intermediate"}
- Runs per week they can do: ${runs_per_week || "3"}
- Lifts per week they can do: ${lifts_per_week || "3"}
- Available time per session: ${available_time || "60 minutes"}
${event_name ? `- Upcoming event: ${event_name}` : ""}
${event_date ? `- Event date: ${event_date}` : ""}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const plan = JSON.parse(text);
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GeneratePlan] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
