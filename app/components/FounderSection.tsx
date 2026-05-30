"use client";

// ─── EDIT COPY HERE ────────────────────────────────────────────────────────────
const SECTION_LABEL = "Built by a hybrid athlete.";

// Edit the founder story paragraphs below
const FOUNDER_COPY = `Hybrid started from a simple problem: I wanted to run faster, lift harder, stay lean, and train for HYROX without guessing every week. Most apps only understood one side of training.

Hybrid is being built for athletes who refuse to choose between strength and endurance.`;
// ───────────────────────────────────────────────────────────────────────────────

export default function FounderSection() {
  const paragraphs = FOUNDER_COPY.trim().split("\n\n");

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Subtle left glow */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#39ff14] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-8 sm:p-12">

          {/* Quote mark */}
          <div className="text-[#00e5ff]/30 text-7xl font-serif leading-none mb-4 select-none">"</div>

          {/* Copy */}
          <div className="space-y-4 mb-8">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`leading-relaxed ${
                  i === 0
                    ? "text-white/70 text-lg sm:text-xl"
                    : "text-white font-semibold text-lg sm:text-xl"
                }`}
              >
                {p}
              </p>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 pt-6 border-t border-white/5">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00e5ff] to-[#39ff14] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Hybrid Founder</p>
              <p className="text-white/35 text-xs">HYROX athlete · Runner · Lifter</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
