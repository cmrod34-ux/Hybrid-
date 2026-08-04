import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyUser, rateLimit, capString } from "@/lib/verifyUser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
- If they have a race/event, periodize toward it
- Only schedule training on the days they specified as available — mark other days as rest or recovery`;

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500, headers: corsHeaders });
  }

  const auth = await verifyUser(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: "Please sign in to generate a plan." }, { status: 401, headers: corsHeaders });
  }
  if (!rateLimit(auth.userId ?? req.headers.get("x-forwarded-for") ?? "anon")) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }

  // Every field is length-capped before it reaches the prompt — client input
  // can never inflate token spend.
  const f = (v: unknown, max = 200) => capString(v, max);
  const userPrompt = `Generate a weekly training plan for this athlete:
- Type: ${f(body.athlete_type) || "Hybrid athlete"}
- Goals: ${f(body.goal) || "General fitness"}
- Experience: ${f(body.experience) || "Intermediate"}
- Available training days: ${f(body.training_days) || "Monday through Friday"}
- Training focus: ${f(body.training_focus) || "General"}
- Available time per session: ${f(body.available_time) || "60 minutes"}
- Equipment: ${f(body.equipment) || "Full gym"}
${f(body.event_name) ? `- Upcoming event: ${f(body.event_name)}` : ""}
${f(body.event_date, 60) ? `- Event date: ${f(body.event_date, 60)}` : ""}
${f(body.injuries, 500) ? `- Injuries/limitations: ${f(body.injuries, 500)}` : ""}
${f(body.notes, 1000) ? `- Additional notes: ${f(body.notes, 1000)}` : ""}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    // Extract the JSON object even if the model adds surrounding prose
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1);
    const plan = JSON.parse(text);
    return NextResponse.json({ plan }, { headers: corsHeaders });
  } catch (e: unknown) {
    console.error("[GeneratePlan] Error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: corsHeaders });
  }
}
