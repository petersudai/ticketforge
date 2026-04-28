import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    dangerouslyAllowSVG: true,
  },
  async redirects() {
    return [
      // Old onboarding wizard → dashboard (deleted, replaced by direct signup)
      { source: "/auth/onboarding", destination: "/dashboard", permanent: false },
      // Old become-organiser page → signup (deleted, signup IS organiser signup)
      { source: "/become-organiser", destination: "/auth/signup", permanent: false },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
    }];
  },
};

export default nextConfig;
