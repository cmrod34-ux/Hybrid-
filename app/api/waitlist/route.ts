import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { google } from "googleapis";

// ─── Local backup storage ─────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), "waitlist.json");

function saveEmailLocally(email: string): boolean {
  try {
    const emails: string[] = fs.existsSync(DATA_FILE)
      ? (JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as string[])
      : [];
    if (emails.includes(email)) return false;
    emails.push(email);
    fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2));
    return true;
  } catch {
    // read-only filesystem in production — skip local save
    return true;
  }
}

// ─── Google Sheets ────────────────────────────────────────────────────────────
// Appends each signup as a new row: [email, timestamp]

async function appendToSheet(email: string) {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.log("[Waitlist] Google Sheets credentials not set — skipping sheet append");
    return;
  }

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
    range: "waitlist!A:B",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[email, new Date().toLocaleString("en-US", { timeZone: "America/New_York" })]],
    },
  });

  console.log(`[Waitlist] Appended to Google Sheet: ${email}`);
}

// ─── Gmail notification ───────────────────────────────────────────────────────

async function sendNotification(email: string, total: number) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === "your_16_char_app_password_here") {
    console.log(`[Waitlist] New signup: ${email} — Gmail notification skipped, credentials not set`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"Hybrid Waitlist" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL || GMAIL_USER,
    subject: `🔥 New Hybrid waitlist signup (#${total})`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#080a0f;color:#f0f4ff;border-radius:12px;">
        <h2 style="color:#00e5ff;margin:0 0 8px">New Waitlist Signup</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px">Someone just joined the Hybrid waitlist</p>
        <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Email</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#f0f4ff;">${email}</p>
        </div>
        <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Total signups</p>
          <p style="margin:0;font-size:24px;font-weight:800;color:#39ff14;">${total}</p>
        </div>
        <p style="color:#444;font-size:11px;margin:24px 0 0;text-align:center;">Hybrid — Train Strong. Run Fast. Stay Hybrid.</p>
      </div>
    `,
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const isNew = saveEmailLocally(email);
  const total = 0; // local file not available in production

  if (isNew) {
    await Promise.all([
      appendToSheet(email).catch((e) => console.error("[Waitlist] Sheet error:", e.message)),
      sendNotification(email, total).catch((e) => console.error("[Waitlist] Email error:", e.message)),
    ]);
  }

  return NextResponse.json({ success: true });
}
