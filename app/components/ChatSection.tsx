"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "I run 30 miles/week and lift 3x. How do I structure my training?",
  "How do I prepare for HYROX without losing my strength gains?",
  "What should I eat on days I run and lift?",
  "How do I balance marathon training with keeping muscle?",
];

export default function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey — I'm the Hybrid AI. Ask me anything about training, nutrition, or race prep for hybrid athletes. I'll give you real answers, not generic advice.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply || "Something went wrong. Try again." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#00e5ff] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#39ff14] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
            <span className="text-white/60 text-xs font-medium tracking-wide">Live AI preview</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
            Ask the{" "}
            <span className="gradient-text">Hybrid AI</span>
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
            Get a taste of what training with Hybrid&apos;s AI actually feels like. Ask anything about your training, nutrition, or race prep.
          </p>
        </div>

        {/* Chat window */}
        <div className="bg-[#0d1117] border border-white/8 rounded-3xl overflow-hidden">
          {/* Messages */}
          <div ref={scrollContainerRef} className="h-[420px] overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center mr-3 mt-0.5 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="3" fill="#00e5ff" />
                      <circle cx="7" cy="7" r="6" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.4" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-white"
                      : "bg-white/5 border border-white/8 text-white/80"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center mr-3 mt-0.5 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="3" fill="#00e5ff" />
                    <circle cx="7" cy="7" r="6" stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.4" />
                  </svg>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Starter questions — always in DOM to avoid layout shift */}
          <div className={`px-6 pb-4 flex flex-wrap gap-2 transition-all duration-200 ${messages.length === 1 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none h-0 pb-0 overflow-hidden"}`}>
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs text-white/50 border border-white/10 rounded-full px-3 py-1.5 hover:border-[#00e5ff]/30 hover:text-white/80 transition-all duration-200"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-white/8 p-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask anything about hybrid training..."
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00e5ff]/40 transition-all duration-200 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="bg-[#00e5ff] text-[#080a0f] font-bold text-sm px-5 py-3 rounded-xl hover:bg-white transition-all duration-200 shadow-[0_0_20px_rgba(0,229,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          This is a preview of the Hybrid AI. The full app builds personalized plans, tracks your progress, and adapts week by week.
        </p>
      </div>
    </section>
  );
}
