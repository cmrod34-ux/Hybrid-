"use client";

// ─── EDIT COPY HERE ────────────────────────────────────────────────────────────
const SECTION_LABEL = "The Problem";
const SECTION_TITLE = "Most fitness apps only solve half the problem.";
const SECTION_SUB   = "They're built for one thing. You train for everything.";
const CALLOUT_COPY  = "Hybrid athletes need all three working together — training, nutrition, and recovery — not three separate apps that don't talk to each other.";
// ───────────────────────────────────────────────────────────────────────────────

const problems = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    app: "Running Apps",
    // Edit problem headline and detail below
    problem: "Help your 5K, but ignore your strength.",
    detail: "Your aerobic base improves. Your power, muscle, and structural resilience stay exactly where they were. You run faster until you get injured.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="9" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="19" y="9" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="5" y="7" width="3" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="16" y="7" width="3" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="8" y="10" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    app: "Lifting Apps",
    problem: "Build muscle, but ignore your engine.",
    detail: "Great for hypertrophy or max strength. Completely silent on how your training load affects your cardio, endurance, or race readiness.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    app: "Nutrition Apps",
    problem: "Give static numbers, but don't understand training load.",
    detail: "They set your macros once and forget you exist. They don't know if today is a 20km long run, a heavy squat session, or a full rest day.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7v5c0 5.25 4.3 10.17 10 11.33C17.7 22.17 22 17.25 22 12V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    app: "Generic Plans",
    problem: "Force hybrid athletes into one box.",
    detail: "You're not a pure runner or a pure lifter. Pre-built plans weren't designed for the athlete who needs strength and endurance to coexist.",
  },
];

export default function ProblemSection() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">

        {/* Section label */}
        <p className="text-red-400 text-xs font-semibold uppercase tracking-widest mb-4 text-center">{SECTION_LABEL}</p>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-center leading-tight mb-5">
          {SECTION_TITLE}
        </h2>

        <p className="text-white/40 text-lg text-center max-w-xl mx-auto mb-16">
          {SECTION_SUB}
        </p>

        {/* Problem grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((item, i) => (
            <div
              key={i}
              className="group bg-[#0d1117] border border-white/8 rounded-2xl p-6 hover:border-red-500/20 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 mb-4 group-hover:text-red-400 group-hover:bg-red-500/10 transition-all duration-300">
                {item.icon}
              </div>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-1">{item.app}</p>
              <h3 className="text-white font-bold text-base mb-2">{item.problem}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>

        {/* Bottom callout */}
        <div className="mt-12 bg-gradient-to-r from-[#0d1117] via-[#0f1620] to-[#0d1117] border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/60 text-lg">
            {CALLOUT_COPY.split("all three working together")[0]}
            <span className="text-white font-semibold">all three working together</span>
            {CALLOUT_COPY.split("all three working together")[1]}
          </p>
        </div>
      </div>
    </section>
  );
}
