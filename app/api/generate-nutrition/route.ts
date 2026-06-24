import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEM_PROMPT = `You are the Hybrid AI nutrition coach. Generate a personalized daily nutrition plan based on the athlete's profile.

Output ONLY valid JSON with this exact structure — no markdown, no explanation, no backticks:
{
  "summary": "1-2 sentence overview of the nutrition approach",
  "daily_targets": {
    "calories": "2800",
    "protein": "180g",
    "carbs": "320g",
    "fat": "90g"
  },
  "meals": [
    {
      "meal": "Breakfast",
      "time": "7:00 AM",
      "title": "Short meal title",
      "description": "What to eat with portions",
      "calories": "650",
      "protein": "40g",
      "carbs": "70g",
      "fat": "22g"
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Rules:
- Include 4-6 meals depending on their preference (breakfast, lunch, dinner + snacks)
- Calculate macros based on their body weight, goals, and activity level
- Be specific with portions and food choices
- Adjust for dietary restrictions
- For hybrid athletes, prioritize protein for recovery and carbs for energy
- Include practical, real food — not just "chicken and rice" every meal
- Tips should be specific to their situation`;

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }

  const userPrompt = `Generate a daily nutrition plan for this athlete:
- Goal: ${body.goal || "General fitness"}
- Body weight: ${body.weight || "Not specified"}
- Height: ${body.height || "Not specified"}
- Age: ${body.age || "Not specified"}
- Gender: ${body.gender || "Not specified"}
- Activity level: ${body.activity_level || "Moderate"}
- Training type: ${body.training_type || "Hybrid (running + lifting)"}
- Meals per day: ${body.meals_per_day || "4"}
- Dietary restrictions: ${body.dietary_restrictions || "None"}
- Foods they dislike: ${body.dislikes || "None"}
- Budget: ${body.budget || "No preference"}
${body.notes ? `- Additional notes: ${body.notes}` : ""}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GenerateNutrition] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
