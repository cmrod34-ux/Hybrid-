"use client";

import { useState } from "react";

const QUESTIONS = [
  {
    id: "experience",
    label: "Experience Level",
    subtitle: "How long have you been training?",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", sub: "Just getting started" },
      { value: "intermediate", label: "Intermediate", sub: "Train consistently 3–5x/week" },
      { value: "advanced", label: "Advanced", sub: "Experienced athlete with structured training" },
      { value: "elite", label: "Elite", sub: "Competitive athlete" },
    ],
  },
  {
    id: "goal",
    label: "Primary Goal",
    subtitle: "What are you training for? Select all that apply.",
    type: "multi",
    options: [
      { value: "build_muscle", label: "Build Muscle", sub: "" },
      { value: "lose_fat", label: "Lose Fat", sub: "" },
      { value: "endurance", label: "Improve Endurance", sub: "" },
      { value: "strength", label: "Increase Strength", sub: "" },
      { value: "hyrox", label: "Train for HYROX", sub: "" },
      { value: "marathon", label: "Train for a Marathon / Half Marathon", sub: "" },
      { value: "overall", label: "Improve Overall Fitness", sub: "" },
      { value: "balance", label: "Balance Strength & Running", sub: "" },
    ],
  },
  {
    id: "training_for",
    label: "What are you currently training for?",
    subtitle: "Select everything that applies.",
    type: "multi",
    options: [
      { value: "hyrox", label: "HYROX", sub: "" },
      { value: "5k", label: "5K", sub: "" },
      { value: "10k", label: "10K", sub: "" },
      { value: "half", label: "Half Marathon", sub: "" },
      { value: "marathon", label: "Marathon", sub: "" },
      { value: "crossfit", label: "CrossFit", sub: "" },
      { value: "general", label: "General Fitness", sub: "" },
      { value: "soccer", label: "Soccer", sub: "" },
      { value: "other", label: "Other Sports", sub: "" },
      { value: "nothing", label: "Nothing Specific", sub: "" },
    ],
  },
  {
    id: "days",
    label: "Training Days Per Week",
    subtitle: "How many days can you realistically commit to training?",
    type: "single",
    options: [
      { value: "2-3", label: "2–3 days", sub: "Great starting point" },
      { value: "4", label: "4 days", sub: "Solid weekly structure" },
      { value: "5", label: "5 days", sub: "High volume" },
      { value: "6", label: "6 days", sub: "Serious athlete" },
      { value: "7", label: "7 days", sub: "Elite training load" },
    ],
  },
  {
    id: "running",
    label: "Running Experience",
    subtitle: "How would you describe your running background?",
    type: "single",
    options: [
      { value: "never", label: "Never Run", sub: "Running is new to me" },
      { value: "casual", label: "Casual Runner", sub: "Occasional runs, no structure" },
      { value: "regular", label: "Regular Runner", sub: "Consistent running routine" },
      { value: "competitive", label: "Competitive Runner", sub: "Race goals and structured training" },
    ],
  },
  {
    id: "strength",
    label: "Strength Training Experience",
    subtitle: "How experienced are you in the weight room?",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", sub: "Still learning the basics" },
      { value: "intermediate", label: "Intermediate", sub: "Comfortable with most movements" },
      { value: "advanced", label: "Advanced", sub: "Structured programming, strong lifts" },
    ],
  },
  {
    id: "nutrition",
    label: "Nutrition Goal",
    subtitle: "What do you want your nutrition plan to focus on?",
    type: "single",
    options: [
      { value: "lose", label: "Lose Weight", sub: "" },
      { value: "maintain", label: "Maintain Weight", sub: "" },
      { value: "gain", label: "Gain Muscle", sub: "" },
      { value: "performance", label: "Optimize Performance", sub: "" },
      { value: "unsure", label: "Unsure", sub: "Let Hybrid decide" },
    ],
  },
  {
    id: "struggle",
    label: "Biggest Struggles",
    subtitle: "What's holding you back? Select all that apply.",
    type: "multi",
    options: [
      { value: "consistency", label: "Staying Consistent", sub: "" },
      { value: "balance", label: "Balancing Running & Lifting", sub: "" },
      { value: "nutrition", label: "Nutrition", sub: "" },
      { value: "recovery", label: "Recovery", sub: "" },
      { value: "programming", label: "Programming", sub: "" },
      { value: "injury", label: "Injury Prevention", sub: "" },
      { value: "time", label: "Time Management", sub: "" },
    ],
  },
  {
    id: "race",
    label: "Upcoming Race or Event?",
    subtitle: "Do you have a specific event you're training toward?",
    type: "race",
    options: [
      { value: "yes", label: "Yes", sub: "I have an upcoming event" },
      { value: "no", label: "No", sub: "Not right now" },
    ],
  },
  {
    id: "email",
    label: "Where should we send your plan?",
    subtitle: "Enter your email to receive early access when Hybrid launches.",
    type: "email",
    options: [],
  },
];

// answers: single = string, multi = string[]
type Answers = Record<string, string | string[]>;

function toggleMulti(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export default function QuestionnaireSection() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = QUESTIONS.length;
  const current = QUESTIONS[step];
  const progress = (step / total) * 100;

  // Single select — auto-advance
  const selectSingle = (value: string) => {
    setAnswers((a) => ({ ...a, [current.id]: value }));
    if (current.type === "single") {
      setTimeout(() => setStep((s) => s + 1), 220);
    }
  };

  // Multi select — toggle, no auto-advance
  const selectMulti = (value: string) => {
    setAnswers((a) => {
      const prev = (a[current.id] as string[]) ?? [];
      return { ...a, [current.id]: toggleMulti(prev, value) };
    });
  };

  const canContinueMulti = () => {
    const val = answers[current.id];
    return Array.isArray(val) && val.length > 0;
  };

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setSubmitting(true);

    // Flatten multi arrays to comma-separated strings for the API
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      flat[k] = Array.isArray(v) ? v.join(", ") : v;
    }

    try {
      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...flat, event_name: eventName, event_date: eventDate }),
      });
    } catch {
      // non-blocking
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  const goalLabels: Record<string, string> = {
    build_muscle: "Build Muscle", lose_fat: "Lose Fat", endurance: "Improve Endurance",
    strength: "Increase Strength", hyrox: "Train for HYROX", marathon: "Train for a Marathon",
    overall: "Improve Overall Fitness", balance: "Balance Strength & Running",
  };

  if (submitted) {
    const goals = answers.goal
      ? (Array.isArray(answers.goal) ? answers.goal : [answers.goal])
      : [];

    return (
      <section id="questionnaire" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00e5ff]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto relative text-center">
          <div className="bg-[#0d1117] border border-[#00e5ff]/20 rounded-3xl p-10 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Your plan is ready to build.</h3>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Based on your answers, Hybrid will build a personalized training, nutrition, and recovery plan designed around your goals.
            </p>

            {/* Summary pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {goals.map((g) => (
                <span key={g} className="bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-semibold px-3 py-1.5 rounded-full">
                  {goalLabels[g] ?? g}
                </span>
              ))}
              {answers.days && (
                <span className="bg-white/5 border border-white/10 text-white/60 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {answers.days} days/week
                </span>
              )}
              {answers.experience && (
                <span className="bg-[#39ff14]/10 border border-[#39ff14]/20 text-[#39ff14] text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                  {answers.experience}
                </span>
              )}
              {answers.nutrition && (
                <span className="bg-white/5 border border-white/10 text-white/60 text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                  {(answers.nutrition as string).replace("_", " ")}
                </span>
              )}
            </div>

            <a
              href="#waitlist"
              className="inline-block bg-[#00e5ff] text-[#080a0f] font-bold text-sm px-10 py-4 rounded-full hover:bg-white transition-all duration-200 shadow-[0_0_30px_rgba(0,229,255,0.25)]"
            >
              Join the Waitlist
            </a>
            <p className="text-white/25 text-xs mt-4">We'll notify you the moment early access opens.</p>
          </div>
        </div>
      </section>
    );
  }

  const multiSelected = (value: string): boolean => {
    const val = answers[current.id];
    return Array.isArray(val) && val.includes(value);
  };

  return (
    <section id="questionnaire" className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00e5ff]/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#00e5ff] opacity-[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
            <span className="text-white/60 text-xs font-medium">Personalized Plan Builder</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Get Your <span className="gradient-text">Personalized</span><br />Hybrid Plan
          </h2>
          <p className="text-white/50 text-lg">
            Answer a few quick questions so Hybrid can understand your goals and build the right training and nutrition plan.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/30 text-xs font-medium">Question {step + 1} of {total}</span>
            <span className="text-white/30 text-xs font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#39ff14] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-[#0d1117] border border-white/8 rounded-3xl p-8 shadow-2xl">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">{`0${step + 1}`}</p>
          <h3 className="text-white font-black text-2xl mb-1">{current.label}</h3>
          {current.subtitle && (
            <p className="text-white/40 text-sm mb-7">{current.subtitle}</p>
          )}

          {/* Single select */}
          {current.type === "single" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {current.options.map((opt) => {
                const selected = answers[current.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => selectSingle(opt.value)}
                    className={`group text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${
                      selected
                        ? "bg-[#00e5ff]/10 border-[#00e5ff]/40 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                        : "bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        selected ? "border-[#00e5ff] bg-[#00e5ff]" : "border-white/20"
                      }`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#080a0f]" />}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm transition-colors duration-200 ${selected ? "text-[#00e5ff]" : "text-white"}`}>
                          {opt.label}
                        </p>
                        {opt.sub && <p className="text-white/35 text-xs mt-0.5">{opt.sub}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi select */}
          {current.type === "multi" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {current.options.map((opt) => {
                  const selected = multiSelected(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectMulti(opt.value)}
                      className={`group text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${
                        selected
                          ? "bg-[#39ff14]/10 border-[#39ff14]/40 shadow-[0_0_20px_rgba(57,255,20,0.08)]"
                          : "bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          selected ? "border-[#39ff14] bg-[#39ff14]" : "border-white/20"
                        }`}>
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#080a0f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <p className={`font-semibold text-sm transition-colors duration-200 ${selected ? "text-[#39ff14]" : "text-white"}`}>
                          {opt.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => canContinueMulti() && setStep((s) => s + 1)}
                disabled={!canContinueMulti()}
                className="mt-5 w-full bg-white/5 border border-white/10 text-white font-semibold text-sm py-4 rounded-2xl hover:border-[#39ff14]/40 hover:bg-[#39ff14]/5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </>
          )}

          {/* Race type */}
          {current.type === "race" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {current.options.map((opt) => {
                  const selected = answers[current.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => selectSingle(opt.value)}
                      className={`group text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${
                        selected
                          ? "bg-[#00e5ff]/10 border-[#00e5ff]/40 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                          : "bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          selected ? "border-[#00e5ff] bg-[#00e5ff]" : "border-white/20"
                        }`}>
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#080a0f]" />}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm transition-colors duration-200 ${selected ? "text-[#00e5ff]" : "text-white"}`}>
                            {opt.label}
                          </p>
                          {opt.sub && <p className="text-white/35 text-xs mt-0.5">{opt.sub}</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {answers.race === "yes" && (
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs font-medium uppercase tracking-widest block mb-2">Event Name</label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g. HYROX Berlin"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff]/50 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs font-medium uppercase tracking-widest block mb-2">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white/60 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff]/50 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {answers.race && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="mt-5 w-full bg-white/5 border border-white/10 text-white font-semibold text-sm py-4 rounded-2xl hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/5 transition-all duration-200"
                >
                  Continue →
                </button>
              )}
            </>
          )}

          {/* Email */}
          {current.type === "email" && (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="your@email.com"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-2xl px-6 py-4 text-base outline-none focus:border-[#00e5ff]/50 transition-all duration-200"
              />
              {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#00e5ff] text-[#080a0f] font-bold text-sm py-4 rounded-2xl hover:bg-white transition-all duration-200 shadow-[0_0_30px_rgba(0,229,255,0.25)] disabled:opacity-60"
              >
                {submitting ? "Building your plan..." : "Build My Hybrid Plan"}
              </button>
              <p className="text-white/25 text-xs text-center">No spam. Early access updates only.</p>
            </div>
          )}
        </div>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-4 flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors duration-200 mx-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        )}
      </div>
    </section>
  );
}
