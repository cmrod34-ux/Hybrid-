"use client";

import { useEffect, useRef } from "react";

// Mock dashboard card shown in the hero
function DashboardCard() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      {/* Glow behind card */}
      <div className="absolute inset-0 rounded-2xl bg-[#00e5ff] opacity-10 blur-3xl scale-110" />

      <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl p-5 shadow-2xl">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Weekly Plan</p>
            <p className="text-white font-bold text-lg mt-0.5">Week 3 of 12</p>
          </div>
          <div className="bg-[#00e5ff]/10 border border-[#00e5ff]/20 rounded-full px-3 py-1">
            <span className="text-[#00e5ff] text-xs font-semibold">On Track</span>
          </div>
        </div>

        {/* Day cards */}
        <div className="space-y-2.5 mb-5">
          {/* Run Day */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3a1 1 0 100-2 1 1 0 000 2zM5.5 6.5L8 4.5l1.5 2L11 5l2 3-2.5 1-1-1.5L8 9l-2.5-2.5z" fill="#00e5ff"/>
                <path d="M4 11l1.5-2 2 1.5L9 9l1.5 2-2.5 2-1.5-1.5-2.5.5z" fill="#00e5ff" opacity="0.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Run Day — Tempo</p>
              <p className="text-white/40 text-xs mt-0.5">8km @ 4:45/km • Zone 3</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00e5ff]" />
          </div>

          {/* Lift Day */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#39ff14]/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="7" width="3" height="2" rx="1" fill="#39ff14"/>
                <rect x="12" y="7" width="3" height="2" rx="1" fill="#39ff14"/>
                <rect x="4" y="5" width="2" height="6" rx="1" fill="#39ff14"/>
                <rect x="10" y="5" width="2" height="6" rx="1" fill="#39ff14"/>
                <rect x="6" y="6.5" width="4" height="3" rx="1" fill="#39ff14" opacity="0.6"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Lift Day — Lower</p>
              <p className="text-white/40 text-xs mt-0.5">Squat, RDL, Lunges • 4 sets</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Nutrition */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3">
            <p className="text-white/40 text-xs mb-1.5">Nutrition Target</p>
            <p className="text-white font-bold text-sm">2,840 kcal</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-[#00e5ff] to-[#0080ff] rounded-full" />
            </div>
            <p className="text-white/30 text-xs mt-1">180g protein</p>
          </div>

          {/* Recovery */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3">
            <p className="text-white/40 text-xs mb-1.5">Recovery Score</p>
            <p className="text-[#39ff14] font-bold text-sm">87 / 100</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[87%] bg-gradient-to-r from-[#39ff14] to-[#00c851] rounded-full" />
            </div>
            <p className="text-white/30 text-xs mt-1">Ready to train</p>
          </div>
        </div>

        {/* Bottom label */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
          <p className="text-white/30 text-xs">AI adapting your plan weekly</p>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden grid-bg">
      {/* Radial gradient backlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00e5ff] opacity-[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#39ff14] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — Copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
              <span className="text-white/60 text-xs font-medium tracking-wide">Now accepting waitlist applications</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight mb-6">
              <span className="text-white">Train Strong.</span>
              <br />
              <span className="text-white">Run Fast.</span>
              <br />
              <span className="gradient-text">Stay Hybrid.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-white/55 text-lg sm:text-xl leading-relaxed mb-8 max-w-md">
              AI-powered training and nutrition plans for athletes who want strength, endurance, and performance — without guessing.
            </p>

            {/* Secondary text */}
            <p className="text-white/30 text-sm mb-10 font-medium tracking-wide uppercase">
              Built for HYROX · Runners · Lifters · Functional Fitness
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <button
                onClick={scrollToWaitlist}
                className="group relative bg-[#00e5ff] text-[#080a0f] font-bold text-base px-8 py-4 rounded-full hover:bg-white transition-all duration-200 shadow-[0_0_30px_rgba(0,229,255,0.3)] hover:shadow-[0_0_50px_rgba(0,229,255,0.5)]"
              >
                Join the Waitlist
                <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <p className="text-white/30 text-sm self-center">Free early access · No credit card</p>
            </div>
          </div>

          {/* Right — Dashboard card */}
          <div className="flex justify-center lg:justify-end">
            <DashboardCard />
          </div>
        </div>
      </div>
    </section>
  );
}
