"use client";

import { useState, useEffect } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080a0f]/90 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#00e5ff] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 3L7 5.5L9 2L12 7L9 10L7 7.5L5.5 9.5L2 7Z" fill="#080a0f" strokeWidth="0"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Hybrid</span>
        </div>

        {/* CTA */}
        <button
          onClick={scrollToWaitlist}
          className="bg-[#00e5ff] text-[#080a0f] font-semibold text-sm px-5 py-2 rounded-full hover:bg-white transition-colors duration-200"
        >
          Join the Hybrid Waitlist
        </button>
      </div>
    </nav>
  );
}
