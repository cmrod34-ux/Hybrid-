"use client";

// Nutrition AI Section
const useCases = [
  {
    accent: "#00e5ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Cutting while maintaining performance",
    description:
      "Stay in a calorie deficit without cratering your training. Hybrid keeps protein high and times carbs around sessions.",
  },
  {
    accent: "#39ff14",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" stroke="#39ff14" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Building muscle without losing endurance",
    description:
      "A strategic surplus that fuels strength gains while keeping your aerobic base intact.",
  },
  {
    accent: "#00e5ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M5 21V4m0 0h13l-2.5 4L18 12H5" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Race-week fueling",
    description:
      "Carb loading, hydration strategy, and pre-race nutrition plans timed perfectly for your event day.",
  },
  {
    accent: "#a855f7",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Recovery meals",
    description:
      "Post-session recommendations based on session type — prioritizing glycogen replenishment after hard runs or protein after heavy lifts.",
  },
];

export default function NutritionSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Right glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#39ff14] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — Copy */}
          <div>
            <p className="text-[#39ff14] text-xs font-semibold uppercase tracking-widest mb-4">Nutrition AI</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
              Fuel the work.
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              Hybrid calculates your exact calorie, protein, carb, and fat targets based on what you&apos;re training — and updates them when your training changes.
            </p>

            {/* Macro bar visual */}
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">Today — Hard Run Day</p>
                <p className="text-[#00e5ff] font-bold text-sm">2,840 kcal</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Protein", value: "180g", pct: 65, color: "#00e5ff" },
                  { label: "Carbs", value: "320g", pct: 88, color: "#39ff14" },
                  { label: "Fats", value: "75g", pct: 45, color: "#a855f7" },
                ].map((macro) => (
                  <div key={macro.label} className="flex items-center gap-3">
                    <p className="text-white/40 text-xs w-12">{macro.label}</p>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${macro.pct}%`, background: macro.color }}
                      />
                    </div>
                    <p className="text-white text-xs font-semibold w-10 text-right">{macro.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-white/30 text-sm">
              Compare to tomorrow (Rest Day) — 2,200 kcal · 175g protein · 200g carbs · 80g fats
            </p>
          </div>

          {/* Right — Use case cards */}
          <div className="space-y-3">
            {useCases.map((uc, i) => (
              <div
                key={i}
                className="group bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex gap-4 hover:border-white/15 transition-all duration-300"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${uc.accent}12` }}
                >
                  {uc.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">{uc.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{uc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
