import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Stores emails in a local JSON file at project root.
// Replace this with a real database or email service (Supabase, Mailchimp, etc.) before launch.

const DATA_FILE = path.join(process.cwd(), "waitlist.json");

function readEmails(): string[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as string[];
}

function saveEmail(email: string) {
  const emails = readEmails();
  if (!emails.includes(email)) {
    emails.push(email);
    fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  saveEmail(email);
  console.log(`[Waitlist] New signup: ${email}`);

  return NextResponse.json({ success: true });
}
