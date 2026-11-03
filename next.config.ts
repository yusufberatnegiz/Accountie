import type { NextConfig } from "next";
import { PUBLIC_CSP } from "./src/lib/csp";

const dev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // page.dev.tsx files (the fixture preview under /onizleme) are routes only in `next dev`; production builds never see them.
  pageExtensions: dev ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
  serverExternalPackages: ["sharp"],
  // The app moved under /panel; old bookmarks and home-screen shortcuts keep working.
  async redirects() {
    return [
      { source: "/fis/:id", destination: "/panel/fis/:id", permanent: true },
      { source: "/kurallar", destination: "/panel/kurallar", permanent: true },
    ];
  },
  async headers() {
    return [{
      // The panel's CSP (per-request nonce) comes from proxy.ts; two policies on one response would both be enforced.
      source: "/((?!panel(?:/|$)).*)",
      headers: [{ key: "Content-Security-Policy", value: PUBLIC_CSP }],
    }, {
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
