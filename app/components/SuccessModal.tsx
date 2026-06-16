"use client";

interface SuccessModalProps {
  title: string;
  message: string;
  smallText?: string;
  accent?: "cyan" | "green";
  onClose: () => void;
}

export default function SuccessModal({
  title,
  message,
  smallText,
  accent = "cyan",
  onClose,
}: SuccessModalProps) {
  const color = accent === "cyan" ? "#00e5ff" : "#39ff14";

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/80 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="modal-card relative w-full max-w-md bg-[#0d1117] border rounded-3xl p-8 sm:p-10 shadow-2xl text-center"
        style={{ borderColor: `${color}33` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-20 blur-2xl"
          style={{ background: color }}
        />

        <div className="relative">
          {/* Checkmark icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border"
            style={{ background: `${color}1A`, borderColor: `${color}4D` }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 14l7 7L23 7"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h3 className="text-white font-black text-2xl mb-3 leading-tight">{title}</h3>
          <p className="text-white/50 text-base leading-relaxed mb-8">{message}</p>

          <button
            onClick={onClose}
            className="font-bold text-sm px-10 py-4 rounded-full transition-all duration-200 text-[#080a0f]"
            style={{
              background: color,
              boxShadow: `0 0 30px ${color}40`,
            }}
          >
            Back to Website
          </button>

          {smallText && (
            <p className="text-white/25 text-xs mt-5">{smallText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
