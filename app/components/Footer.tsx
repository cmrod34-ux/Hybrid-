"use client";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

        {/* Brand */}
        <div className="flex flex-col items-center sm:items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#00e5ff] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 3L7 5.5L9 2L12 7L9 10L7 7.5L5.5 9.5L2 7Z" fill="#080a0f"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base">Hybrid</span>
          </div>
          <p className="text-white/25 text-xs text-center sm:text-left max-w-xs">
            Built for athletes who refuse to choose between strength and endurance.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {/* Instagram */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/30 hover:text-[#00e5ff] transition-colors duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          {/* TikTok */}
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="text-white/30 hover:text-[#00e5ff] transition-colors duration-200"
          >
            <svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.72a8.2 8.2 0 004.79 1.52V6.79a4.85 4.85 0 01-1.02-.1z"/>
            </svg>
          </a>

          {/* Email */}
          <a
            href="mailto:cmrod34@gmail.com"
            className="text-white/30 hover:text-[#00e5ff] transition-colors duration-200 text-xs font-medium"
          >
            cmrod34@gmail.com
          </a>

          {/* Phone */}
          <a
            href="tel:+12404060910"
            className="text-white/30 hover:text-[#00e5ff] transition-colors duration-200 text-xs font-medium"
          >
            240-406-0910
          </a>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-white/15 text-xs">© 2025 Hybrid. All rights reserved.</p>
        <p className="text-white/15 text-xs">Privacy Policy · Terms of Service</p>
      </div>
    </footer>
  );
}
