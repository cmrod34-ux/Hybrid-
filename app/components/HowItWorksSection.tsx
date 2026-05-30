"use client";

// How It Works — three steps
const steps = [
  {
    number: "01",
    title: "Enter your goals",
    description:
      "Tell Hybrid what you're training for — a HYROX race, a half marathon, muscle gain, or all of the above. Share your current fitness, schedule, and any equipment you have.",
    tags: ["Goals", "Schedule", "Fitness Level"],
  },
  {
    number: "02",
    title: "Get your personalized plan",
    description:
      "Hybrid's AI builds a complete weekly training and nutrition plan tailored to you — balancing strength, cardio, and recovery in the right proportions.",
    tags: ["Training Plan", "Nutrition Targets", "Recovery Windows"],
  },
  {
    number: "03",
    title: "Train, eat, recover, and adjust",
    description:
      "Log your sessions, track nutrition, and monitor recovery. Hybrid adapts your plan every week based on how you're performing and feeling.",
    tags: ["Weekly Adaptation", "Performance Tracking", "Smart Adjustments"],
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Section label */}
        <p className="text-[#00e5ff] text-xs font-semibold uppercase tracking-widest mb-4 text-center">How It Works</p>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-center leading-tight mb-16">
          Simple process.
          <span className="text-white/30"> Powerful results.</span>
        </h2>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-start lg:items-center text-left lg:text-center">
                {/* Step number */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#0d1117] border border-white/10 flex items-center justify-center relative z-10">
                    <span className="font-black text-2xl gradient-text">{step.number}</span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-[#00e5ff] opacity-5 blur-xl" />
                </div>

                {/* Content */}
                <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-4">{step.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 lg:justify-center">
                  {step.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="bg-white/5 border border-white/8 text-white/50 text-xs px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
