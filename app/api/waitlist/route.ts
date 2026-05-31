import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

// ─── Local storage ────────────────────────────────────────────────────────────
// Emails are saved to waitlist.json at the project root.
// You can replace this with Supabase, Postgres, etc. before launch.

const DATA_FILE = path.join(process.cwd(), "waitlist.json");

function readEmails(): string[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as string[];
}

function saveEmail(email: string): boolean {
  const emails = readEmails();
  if (emails.includes(email)) return false; // already on list
  emails.push(email);
  fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2));
  return true;
}

// ─── Email notification ───────────────────────────────────────────────────────
// Sends you (NOTIFY_EMAIL) a Gmail notification whenever someone joins.
// Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env.local — see that file
// for instructions on generating a Gmail App Password.

async function sendNotification(signupEmail: string, totalCount: number) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === "your_16_char_app_password_here") {
    // Credentials not configured yet — skip silently, still log to console
    console.log(`[Waitlist] New signup: ${signupEmail} (total: ${totalCount}) — email notification skipped, credentials not set`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Hybrid Waitlist" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL || GMAIL_USER,
    subject: `🔥 New Hybrid waitlist signup (#${totalCount})`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#080a0f;color:#f0f4ff;border-radius:12px;">
        <h2 style="color:#00e5ff;margin:0 0 8px">New Waitlist Signup</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px">Someone just joined the Hybrid waitlist</p>

        <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Email</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#f0f4ff;">${signupEmail}</p>
        </div>

        <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;">
          <p style="margin:0 0 4px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Total signups</p>
          <p style="margin:0;font-size:24px;font-weight:800;color:#39ff14;">${totalCount}</p>
        </div>

        <p style="color:#444;font-size:11px;margin:24px 0 0;text-align:center;">Hybrid — Train Strong. Run Fast. Stay Hybrid.</p>
      </div>
    `,
  });

  console.log(`[Waitlist] New signup: ${signupEmail} (total: ${totalCount}) — notification sent to ${NOTIFY_EMAIL}`);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const isNew = saveEmail(email);
  const totalCount = readEmails().length;

  if (isNew) {
    // Fire notification in the background — don't block the response
    sendNotification(email, totalCount).catch((err) =>
      console.error("[Waitlist] Notification error:", err)
    );
  }

  return NextResponse.json({ success: true });
}
