import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const DATA_FILE = path.join(process.cwd(), "plans.json");

interface PlanEntry {
  id: string;
  timestamp: string;
  email: string;
  experience: string;
  goal: string;
  training_for: string;
  days: string;
  running: string;
  strength: string;
  nutrition: string;
  struggle: string;
  race: string;
  event_name: string;
  event_date: string;
}

function savePlanLocally(entry: PlanEntry): void {
  try {
    const entries: PlanEntry[] = fs.existsSync(DATA_FILE)
      ? (JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PlanEntry[])
      : [];
    entries.push(entry);
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
  } catch {
    // read-only filesystem in production — skip local save
  }
}

async function appendPlanToSheet(entry: PlanEntry) {
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
    range: "plans !A:N",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        entry.timestamp,
        entry.email,
        entry.experience,
        entry.goal,
        entry.training_for,
        entry.days,
        entry.running,
        entry.strength,
        entry.nutrition,
        entry.struggle,
        entry.race,
        entry.event_name,
        entry.event_date,
      ]],
    },
  });
}

async function sendPlanNotification(entry: PlanEntry) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === "your_16_char_app_password_here") return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const row = (label: string, value: string) =>
    value
      ? `<div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:16px;">
           <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;flex-shrink:0;">${label}</p>
           <p style="margin:0;font-size:13px;font-weight:600;color:#f0f4ff;text-align:right;">${value}</p>
         </div>`
      : "";

  await transporter.sendMail({
    from: `"Hybrid Plan Builder" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL || GMAIL_USER,
    subject: `🏋️ New plan submission from ${entry.email} · ${entry.timestamp}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#080a0f;color:#f0f4ff;border-radius:12px;">
        <h2 style="color:#00e5ff;margin:0 0 4px">New Plan Builder Submission</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px">${entry.timestamp}</p>
        ${row("Email", entry.email)}
        ${row("Experience", entry.experience)}
        ${row("Goal", entry.goal)}
        ${row("Training For", entry.training_for)}
        ${row("Days / Week", entry.days)}
        ${row("Running Level", entry.running)}
        ${row("Strength Level", entry.strength)}
        ${row("Nutrition Goal", entry.nutrition)}
        ${row("Biggest Struggle", entry.struggle)}
        ${row("Upcoming Race", entry.race)}
        ${entry.race === "yes" ? row("Event", `${entry.event_name}${entry.event_date ? " · " + entry.event_date : ""}`) : ""}
        <p style="color:#444;font-size:11px;margin:24px 0 0;text-align:center;">Hybrid — Train Strong. Run Fast. Stay Hybrid.</p>
      </div>
    `,
  });
}

function appendToWaitlist(email: string) {
  try {
    const waitlistFile = path.join(process.cwd(), "waitlist.json");
    const emails: string[] = fs.existsSync(waitlistFile)
      ? (JSON.parse(fs.readFileSync(waitlistFile, "utf-8")) as string[])
      : [];
    if (!emails.includes(email)) {
      emails.push(email);
      fs.writeFileSync(waitlistFile, JSON.stringify(emails, null, 2));
    }
  } catch {
    // read-only filesystem in production — skip
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const entry: PlanEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
    email,
    experience: String(body.experience ?? "").trim(),
    goal: String(body.goal ?? "").trim(),
    training_for: String(body.training_for ?? "").trim(),
    days: String(body.days ?? "").trim(),
    running: String(body.running ?? "").trim(),
    strength: String(body.strength ?? "").trim(),
    nutrition: String(body.nutrition ?? "").trim(),
    struggle: String(body.struggle ?? "").trim(),
    race: String(body.race ?? "").trim(),
    event_name: String(body.event_name ?? "").trim(),
    event_date: String(body.event_date ?? "").trim(),
  };

  savePlanLocally(entry);
  appendToWaitlist(email);
  await Promise.all([
    appendPlanToSheet(entry).catch((e) => console.error("[Plan] Sheet error:", e.message)),
    sendPlanNotification(entry).catch((e) => console.error("[Plan] Email error:", e.message)),
  ]);

  return NextResponse.json({ success: true });
}
