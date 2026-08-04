import type { NextConfig } from "next";

// Baseline security headers for every response. A Content-Security-Policy is
// deliberately NOT set yet — adding one blind would break Next's inline
// runtime scripts; introduce it with nonces as a follow-up (see security
// audit notes). These headers are safe for all current pages and APIs.
const securityHeaders = [
  // Never MIME-sniff responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The site is never legitimately framed — block clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site uses none of these browser capabilities.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HTTPS only (Vercel serves HTTPS; this pins browsers to it).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
