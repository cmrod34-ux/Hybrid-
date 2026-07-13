"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Public client credentials — the anon key is designed to ship in clients
// (the mobile app bundles the same values). Row access is enforced by
// Supabase auth policies, not by hiding this key.
const SUPABASE_URL = "https://rfbyryyxadukdtrziboa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmYnlyeXl4YWR1a2R0cnppYm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzQwNDYsImV4cCI6MjA5NzcxMDA0Nn0.i5csVH8EAUITiYz9lNpoDKP7ZNW-O_GBodT0bE0Ty34";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: true, persistSession: false },
});

type Stage = "checking" | "ready" | "no-token" | "done";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The email link carries a recovery token in the URL; supabase-js parses
    // it on load and emits PASSWORD_RECOVERY / SIGNED_IN when it's valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setStage("ready");
    });
    // If nothing arrives shortly, the page was opened without a valid link.
    const timer = setTimeout(() => {
      setStage((s) => (s === "checking" ? "no-token" : s));
    }, 2500);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSave = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.auth.signOut();
    setStage("done");
  };

  return (
    <main className="min-h-screen bg-[#080a0f] px-6 py-20">
      <div className="max-w-md mx-auto">
        <p className="text-[#00e5ff] text-2xl font-black tracking-widest text-center mb-10">HYBRID</p>

        {stage === "checking" && <p className="text-white/50 text-center">Checking your reset link…</p>}

        {stage === "no-token" && (
          <div className="text-center">
            <h1 className="text-2xl font-black text-white mb-3">Reset link needed</h1>
            <p className="text-white/50 leading-relaxed mb-8">
              This page only works from a password-reset email. Open the Hybrid app, tap
              &ldquo;Forgot password?&rdquo; on the sign-in screen, and follow the link we send you.
            </p>
            <Link href="/" className="text-[#00e5ff] font-semibold hover:text-white transition-colors">
              ← Back to Hybrid
            </Link>
          </div>
        )}

        {stage === "ready" && (
          <div>
            <h1 className="text-2xl font-black text-white mb-2 text-center">Set a new password</h1>
            <p className="text-white/45 text-center mb-8">Choose a new password for your Hybrid account.</p>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e5ff]/40 transition-all"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e5ff]/40 transition-all"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#00e5ff] text-[#080a0f] font-bold text-sm py-4 rounded-full hover:bg-white transition-all disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save New Password"}
              </button>
              {error && <p className="text-red-400 text-sm text-center pt-1">{error}</p>}
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="text-center">
            <h1 className="text-2xl font-black text-white mb-3">Password updated ✓</h1>
            <p className="text-white/50 leading-relaxed">
              You&rsquo;re all set — open the Hybrid app and sign in with your new password.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
