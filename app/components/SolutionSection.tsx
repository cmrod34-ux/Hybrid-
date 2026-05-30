"use client";

// Solution section — feature cards
const features = [
  {
    accent: "#00e5ff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L3 6v5c0 4.5 3.5 8.7 8 10 4.5-1.3 8-5.5 8-10V6l-8-4z" stroke="#00e5ff" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI Training Plans",
    description: "Personalized weekly programs that adapt to your goals, performance, and recovery — not a static 12-week PDF.",
  },
  {
    accent: "#39ff14",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="11" r="5" stroke="#39ff14" strokeWidth="1.5"/>
        <circle cx="14" cy="11" r="5" stroke="#39ff14" strokeWidth="1.5" opacity="0.5"/>
        <path d="M11 8v6M9 10l2-2 2 2" stroke="#39ff14" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: "Strength + Running Balance",
    description: "Intelligently balances your lifting and cardio load so you develop both without overtraining or sacrificing either.",
  },
  {
    accent: "#00e5ff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3l2.5 5 5.5.8-4 3.9.95 5.5L11 16l-4.95 2.2.95-5.5L3 8.8 8.5 8z" stroke="#00e5ff" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: "HYROX & Race Prep",
    description: "Dedicated race prep phases for HYROX, obstacle courses, and running events built into your hybrid program.",
  },
  {
    accent: "#39ff14",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 10h14M4 14h9" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="3" y="6" width="16" height="12" rx="2" stroke="#39ff14" strokeWidth="1.5"/>
        <path d="M7 6V4M15 6V4" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Nutrition AI",
    description: "Daily calorie and macro targets that shift based on your training schedule — more carbs on hard days, more protein on recovery days.",
  },
  {
    accent: "#00e5ff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4C7.13 4 4 7.13 4 11s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" stroke="#00e5ff" strokeWidth="1.5"/>
        <path d="M11 8v3l2 2" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17.5 4.5l-1.5 1.5M4.5 17.5l1.5-1.5" stroke="#00e5ff" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    title: "Recovery Adjustments",
    description: "When you're fatigued or overreaching, Hybrid automatically de-loads or swaps sessions to keep you progressing safely.",
  },
  {
    accent: "#39ff14",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 16l4-4 3 3 4-5 3 3" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="#39ff14" strokeWidth="1.5" opacity="0.4"/>
      </svg>
    ),
    title: "Progress Tracking",
    description: "Track PRs, run paces, body composition, and performance metrics — all in one dashboard built for hybrid athletes.",
  },
];

export default function SolutionSection() {
  return (
    <section className="py-24 px-6 relative">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0080ff] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">

        {/* Section label */}
        <p className="text-[#00e5ff] text-xs font-semibold uppercase tracking-widest mb-4 text-center">The Solution</p>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-center leading-tight mb-5">
          Hybrid connects training,
          <br />
          <span className="gradient-text">nutrition, and recovery.</span>
        </h2>

        <p className="text-white/40 text-lg text-center max-w-xl mx-auto mb-16">
          One platform. Every variable. Zero guessing.
        </p>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <div
              key={i}
              className="group bg-[#0d1117] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(circle at top left, ${feat.accent}08 0%, transparent 60%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative"
                style={{ background: `${feat.accent}12` }}
              >
                {feat.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2 relative">{feat.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed relative">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
