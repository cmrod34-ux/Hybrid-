import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const DATA_FILE = path.join(process.cwd(), "feedback.json");

interface FeedbackEntry {
  id: string;
  timestamp: string;
  athlete_type: string;
  current_apps: string;
  frustration: string;
  wanted_feature: string;
  wanted_feature_other: string;
  expectations: string;
  website_feedback: string;
  one_feature: string;
  would_pay: string;
  email: string;
}

function saveFeedbackLocally(entry: FeedbackEntry): void {
  try {
    const entries: FeedbackEntry[] = fs.existsSync(DATA_FILE)
      ? (JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as FeedbackEntry[])
      : [];
    entries.push(entry);
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
  } catch {
    // read-only filesystem in production — skip local save
  }
}

async function appendFeedbackToSheet(entry: FeedbackEntry) {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) return;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "feedback !A:M",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        entry.timestamp,
        entry.athlete_type,
        entry.current_apps,
        entry.frustration,
        entry.wanted_feature,
        entry.wanted_feature_other,
        entry.expectations,
        entry.website_feedback,
        entry.one_feature,
        entry.would_pay,
        entry.email,
      ]],
    },
  });
}

async function sendFeedbackNotification(entry: FeedbackEntry, total: number) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === "your_16_char_app_password_here") return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const field = (label: string, value: string) =>
    value
      ? `<div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;margin-bottom:10px;">
           <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">${label}</p>
           <p style="margin:0;font-size:14px;color:#f0f4ff;">${value}</p>
         </div>`
      : "";

  await transporter.sendMail({
    from: `"Hybrid Feedback" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL || GMAIL_USER,
    subject: `💬 New Hybrid feedback submission (#${total})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#080a0f;color:#f0f4ff;border-radius:12px;">
        <h2 style="color:#39ff14;margin:0 0 4px">New Feedback Submission</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px">Response #${total} · ${entry.timestamp}</p>
        ${field("Athlete Type", entry.athlete_type)}
        ${field("Current Apps", entry.current_apps)}
        ${field("Biggest Frustration", entry.frustration)}
        ${field("Wanted Feature", entry.wanted_feature + (entry.wanted_feature_other ? ` — ${entry.wanted_feature_other}` : ""))}
        ${field("Expectations", entry.expectations)}
        ${field("Website Feedback", entry.website_feedback)}
        ${field("One Feature", entry.one_feature)}
        ${field("Would Pay", entry.would_pay)}
        ${field("Email", entry.email || "(not provided)")}
        <p style="color:#444;font-size:11px;margin:24px 0 0;text-align:center;">Hybrid — Train Strong. Run Fast. Stay Hybrid.</p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const entry: FeedbackEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    athlete_type: String(body.athlete_type ?? "").trim(),
    current_apps: String(body.current_apps ?? "").trim(),
    frustration: String(body.frustration ?? "").trim(),
    wanted_feature: String(body.wanted_feature ?? "").trim(),
    wanted_feature_other: String(body.wanted_feature_other ?? "").trim(),
    expectations: String(body.expectations ?? "").trim(),
    website_feedback: String(body.website_feedback ?? "").trim(),
    one_feature: String(body.one_feature ?? "").trim(),
    would_pay: String(body.would_pay ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
  };

  saveFeedbackLocally(entry);
  const total = readFeedback().length;

  Promise.all([
    appendFeedbackToSheet(entry).catch((e) => console.error("[Feedback] Sheet error:", e.message)),
    sendFeedbackNotification(entry, total).catch((e) => console.error("[Feedback] Email error:", e.message)),
  ]);

  return NextResponse.json({ success: true });
}
