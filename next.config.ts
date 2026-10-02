import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 * Kept simple and dependency-free: no inline scripts are used by the app itself, but
 * Next.js does inject its own bootstrap scripts, so `script-src` stays permissive for
 * `'unsafe-inline'` while everything else is locked down.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Google account avatars (Better Auth stores this in `user.image`).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Demo photography for the seeded service catalogue.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;