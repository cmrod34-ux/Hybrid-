"use client";

// ─── EDIT COPY HERE ────────────────────────────────────────────────────────────
const SECTION_LABEL = "How It Works";
const SECTION_TITLE = "Your plan, built around everything you train for.";
const SECTION_SUB   = "Three components. One system. Zero guesswork.";
// ───────────────────────────────────────────────────────────────────────────────

const columns = [
  {
    accent: "#00e5ff",
    step: "Input",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Tell Hybrid about you",
    items: [
      "Goals — race, strength, body comp",
      "Race date or target event",
      "Current fitness & training history",
      "Weekly schedule & availability",
      "Equipment & gym access",
    ],
  },
  {
    accent: "#ffffff",
    step: "Hybrid AI",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="white" strokeWidth="1.5"/>
        <path d="M8 12s1.5-2 4-2 4 2 4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 9h.01M15 9h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Balances everything",
    items: [
      "Optimal training load split",
      "Strength vs endurance periodisation",
      "Nutrition calibrated to training days",
      "Recovery windows built in",
      "Adapts weekly to your performance",
    ],
  },
  {
    accent: "#39ff14",
    step: "Output",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Your complete weekly plan",
    items: [
      "Day-by-day workouts (lift + run)",
      "Daily macro & calorie targets",
      "Recovery and deload adjustments",
      "Progress tracking & PR logging",
      "Plan updates every week",
    ],
  },
];

export default function ProductFlowSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Section label */}
        <p className="text-[#00e5ff] text-xs font-semibold uppercase tracking-widest mb-4 text-center">{SECTION_LABEL}</p>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-center leading-tight mb-4">
          {SECTION_TITLE}
        </h2>
        <p className="text-white/40 text-lg text-center max-w-xl mx-auto mb-16">{SECTION_SUB}</p>

        {/* Three columns */}
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector arrows (desktop) */}
          <div className="hidden md:flex absolute top-12 left-[33%] right-[33%] items-center justify-between pointer-events-none px-4">
            <span className="text-white/15 text-2xl">→</span>
            <span className="text-white/15 text-2xl">→</span>
          </div>

          {columns.map((col, i) => (
            <div
              key={i}
              className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all duration-300"
            >
              {/* Step badge */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${col.accent}12` }}
                >
                  {col.icon}
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: col.accent }}
                >
                  {col.step}
                </span>
              </div>

              <h3 className="text-white font-bold text-lg mb-4">{col.title}</h3>

              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-white/45 text-sm">
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: col.accent }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
