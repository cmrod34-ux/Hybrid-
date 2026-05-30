"use client";

import { useState } from "react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
      return;
    }
    setEmail("");
  };

  return (
    <section id="waitlist" className="py-32 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00e5ff]/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#00e5ff] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
          <span className="text-white/60 text-xs font-medium">Limited early access spots</span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
          Be first to try{" "}
          <span className="gradient-text">Hybrid.</span>
        </h2>

        <p className="text-white/50 text-lg mb-12">
          Join athletes already on the waitlist and get early access when we launch.
        </p>

        {/* Form */}
        {status === "success" ? (
          <div className="bg-[#39ff14]/10 border border-[#39ff14]/20 rounded-2xl p-8">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="text-[#39ff14] font-bold text-xl mb-2">You're on the list.</h3>
            <p className="text-white/50 text-sm">
              We'll email you as soon as early access opens. Welcome to Hybrid.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="your@email.com"
              className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-full px-6 py-4 text-sm outline-none focus:border-[#00e5ff]/50 focus:bg-white/8 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#00e5ff] text-[#080a0f] font-bold text-sm px-8 py-4 rounded-full hover:bg-white transition-all duration-200 shadow-[0_0_30px_rgba(0,229,255,0.25)] hover:shadow-[0_0_50px_rgba(0,229,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
        )}

        {/* Error */}
        {status === "error" && (
          <p className="text-red-400 text-sm mt-3">{errorMsg}</p>
        )}

        {/* Trust text */}
        {status !== "success" && (
          <p className="text-white/25 text-xs mt-5">
            No spam. Just early access updates. Unsubscribe anytime.
          </p>
        )}
      </div>
    </section>
  );
}
