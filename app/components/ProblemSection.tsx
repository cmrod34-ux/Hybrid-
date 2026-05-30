"use client";

// Problem section — "Most fitness apps only solve half the problem."
const problems = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    app: "Running Apps",
    problem: "Ignore strength training",
    detail: "They'll help you hit a 5K PR but leave your upper body and power completely underdeveloped.",
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
    problem: "Ignore endurance",
    detail: "Optimised for hypertrophy or strength, not for the athlete who also needs to run 10km.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    app: "Nutrition Apps",
    problem: "Static targets, zero context",
    detail: "They set your calories once. They don't know if today is a 20km long run or a full rest day.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7v5c0 5.25 4.3 10.17 10 11.33C17.7 22.17 22 17.25 22 12V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    app: "Generic Plans",
    problem: "Built for one discipline",
    detail: "You're not a pure runner or a pure lifter. Cookie-cutter plans aren't designed for the hybrid athlete.",
  },
];

export default function ProblemSection() {
  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">

        {/* Section label */}
        <p className="text-[#00e5ff] text-xs font-semibold uppercase tracking-widest mb-4 text-center">The Problem</p>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-center leading-tight mb-5">
          Most fitness apps only solve
          <br />
          <span className="text-white/40">half the problem.</span>
        </h2>

        <p className="text-white/40 text-lg text-center max-w-xl mx-auto mb-16">
          They're built for one thing. You train for everything.
        </p>

        {/* Problem grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((item, i) => (
            <div
              key={i}
              className="group bg-[#0d1117] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 mb-4 group-hover:text-[#00e5ff] group-hover:bg-[#00e5ff]/10 transition-all duration-300">
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
            Hybrid athletes need{" "}
            <span className="text-white font-semibold">all three working together</span>
            {" "}— training, nutrition, and recovery — not three separate apps that don't talk to each other.
          </p>
        </div>
      </div>
    </section>
  );
}
