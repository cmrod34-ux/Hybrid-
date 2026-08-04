"use client";

import { useState } from "react";
import SuccessModal from "@/app/components/SuccessModal";

const ATHLETE_TYPES = [
  "Runner",
  "Lifter",
  "HYROX Athlete",
  "CrossFit Athlete",
  "Hybrid Athlete",
  "Endurance Athlete",
  "General Fitness",
];

const FEATURE_OPTIONS = [
  "AI Training Plans",
  "Nutrition Coaching",
  "Recovery Recommendations",
  "Race Preparation",
  "Strength + Running Programming",
  "Garmin/Wearable Integration",
  "Other",
];

const PAY_OPTIONS = ["Yes", "Maybe", "No"];

interface FormState {
  athlete_type: string[];
  current_apps: string;
  frustration: string;
  wanted_feature: string[];
  wanted_feature_other: string;
  expectations: string;
  website_feedback: string;
  one_feature: string;
  would_pay: string;
  email: string;
}

const EMPTY: FormState = {
  athlete_type: [],
  current_apps: "",
  frustration: "",
  wanted_feature: [],
  wanted_feature_other: "",
  expectations: "",
  website_feedback: "",
  one_feature: "",
  would_pay: "",
  email: "",
};

function ChipGroup({
  options,
  value,
  onChange,
  accent = "cyan",
  multi = false,
}: {
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  accent?: "cyan" | "green";
  multi?: boolean;
}) {
  const activeColor =
    accent === "cyan"
      ? "border-[#00e5ff] bg-[#00e5ff]/10 text-[#00e5ff]"
      : "border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14]";

  const isSelected = (opt: string) =>
    multi ? (value as string[]).includes(opt) : value === opt;

  const handleClick = (opt: string) => {
    if (!multi) {
      onChange(opt);
    } else {
      const arr = value as string[];
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => handleClick(opt)}
          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
            isSelected(opt)
              ? activeColor
              : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <p className="text-white/80 text-sm font-semibold mb-3">
      {label}
      {optional && <span className="text-white/30 font-normal ml-2 text-xs">Optional</span>}
    </p>
  );
}

const textareaClass =
  "w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff]/40 focus:bg-white/8 transition-all duration-200 resize-none";

const inputClass =
  "w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff]/40 focus:bg-white/8 transition-all duration-200";

export default function FeedbackSection() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (key: keyof FormState) => (val: string | string[]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          athlete_type: form.athlete_type.join(", "),
          wanted_feature: form.wanted_feature.join(", "),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setForm(EMPTY);
    } catch {
      setStatus("error");
    }
  };

  const closeModal = () => setStatus("idle");

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#39ff14] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00e5ff] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
            <span className="text-white/60 text-xs font-medium tracking-wide">Your voice shapes what we build</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
            Help Build the Future of{" "}
            <span className="gradient-text">Hybrid Training</span>
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
            We&apos;re building Hybrid for athletes like you. Tell us what you want, what frustrates you, and what would make you switch from your current apps.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Q1 — Athlete type */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="What best describes you?" />
            <ChipGroup options={ATHLETE_TYPES} value={form.athlete_type} onChange={set("athlete_type")} multi />
          </div>

          {/* Q2 — Current apps */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="What apps do you currently use?" optional />
            <input
              type="text"
              value={form.current_apps}
              onChange={(e) => set("current_apps")(e.target.value)}
              placeholder="e.g. Strava, MyFitnessPal, TrainingPeaks..."
              className={inputClass}
            />
          </div>

          {/* Q3 — Frustration */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="What's your biggest frustration with your current fitness apps?" optional />
            <textarea
              rows={3}
              value={form.frustration}
              onChange={(e) => set("frustration")(e.target.value)}
              placeholder="Too many apps, no integration, generic plans..."
              className={textareaClass}
            />
          </div>

          {/* Q4 — Wanted feature */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="What feature would make you use Hybrid immediately?" />
            <ChipGroup
              options={FEATURE_OPTIONS}
              value={form.wanted_feature}
              onChange={set("wanted_feature")}
              accent="green"
              multi
            />
            {form.wanted_feature.includes("Other") && (
              <input
                type="text"
                value={form.wanted_feature_other}
                onChange={(e) => set("wanted_feature_other")(e.target.value)}
                placeholder="Describe the feature..."
                className={`${inputClass} mt-3`}
                autoFocus
              />
            )}
          </div>

          {/* Q5 — Expectations */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="What do you expect from an app like Hybrid?" optional />
            <textarea
              rows={3}
              value={form.expectations}
              onChange={(e) => set("expectations")(e.target.value)}
              placeholder="Personalized plans, smart recovery, accurate nutrition targets..."
              className={textareaClass}
            />
          </div>

          {/* Q6 — Website feedback */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="Is there anything you don't like about the current website or concept?" optional />
            <textarea
              rows={3}
              value={form.website_feedback}
              onChange={(e) => set("website_feedback")(e.target.value)}
              placeholder="Be brutal — we can take it."
              className={textareaClass}
            />
          </div>

          {/* Q7 — One feature */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="If you could add ONE feature, what would it be?" optional />
            <textarea
              rows={2}
              value={form.one_feature}
              onChange={(e) => set("one_feature")(e.target.value)}
              placeholder="Dream big."
              className={textareaClass}
            />
          </div>

          {/* Q8 — Would pay */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 transition-all duration-200 hover:border-white/12">
            <FieldLabel label="Would you pay for a platform that successfully combines training, nutrition, and recovery?" />
            <ChipGroup options={PAY_OPTIONS} value={form.would_pay} onChange={set("would_pay")} />
          </div>

          {/* Q9 — Email */}
          <div className="bg-[#0d1117] border border-[#00e5ff]/10 rounded-2xl p-6 transition-all duration-200 hover:border-[#00e5ff]/20">
            <FieldLabel label="Leave your email if you'd like updates or early access." optional />
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="your@email.com"
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full sm:w-auto bg-[#39ff14] text-[#080a0f] font-bold text-base px-10 py-4 rounded-full hover:bg-white transition-all duration-200 shadow-[0_0_30px_rgba(57,255,20,0.25)] hover:shadow-[0_0_50px_rgba(57,255,20,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Submitting..." : "Send Feedback"}
            </button>
            {status === "error" && (
              <p className="text-red-400 text-sm mt-3">Something went wrong. Please try again.</p>
            )}
          </div>
        </form>
      </div>

      {status === "success" && (
        <SuccessModal
          accent="green"
          title="Thank you for helping build Hybrid."
          message="Your feedback directly helps us decide what to build next. Every response brings Hybrid one step closer to becoming the app hybrid athletes actually need."
          smallText="We appreciate honest feedback, feature ideas, and anything you think could make Hybrid better."
          onClose={closeModal}
        />
      )}
    </section>
  );
}
