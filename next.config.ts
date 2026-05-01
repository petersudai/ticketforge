import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  turbopack: {},

  images: {
    // Allow any HTTPS host (event organisers upload images from arbitrary CDNs).
    // SVG is required for QR codes and logos; sandboxed via contentSecurityPolicy.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async redirects() {
    return [
      { source: "/auth/onboarding", destination: "/dashboard",    permanent: false },
      { source: "/become-organiser", destination: "/auth/signup", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          // MIME-sniffing protection
          { key: "X-Content-Type-Options",    value: "nosniff" },
          // Legacy XSS filter (belt-and-suspenders for old browsers)
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          // Limit referrer leakage across origins
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Restrict browser features not needed by this app
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Shared-array-buffer / cross-origin isolation (needed for html2canvas)
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          // HSTS — production only; avoids breaking localhost dev
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
      {
        // M-Pesa callback must accept Safaricom's POST without COEP restrictions
        source: "/api/mpesa/callback",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
};

export default nextConfig;
