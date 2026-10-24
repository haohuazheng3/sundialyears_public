import type { NextConfig } from "next";

/**
 * Indexing switch. Pre-launch every environment is noindex (meta + X-Robots-Tag).
 * Flip SITE_INDEXABLE=true on the production env at launch (and only there).
 */
const indexable = process.env.SITE_INDEXABLE === "true" && process.env.VERCEL_ENV === "production";

// Third parties the page may talk to. FlowGlance = analytics; Google = AdSense (only active once a
// publisher id is configured). Kept as narrow as AdSense allows.
const adsHosts = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.gstatic.com",
  "https://*.googleadservices.com",
  "https://*.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com",
];

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://flowglance.com ${adsHosts.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://flowglance.com https://*.flowglance.com ${adsHosts.join(" ")}`,
  `frame-src 'self' ${adsHosts.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // No remote image proxy: avoids an open optimizer (and its bill).
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    const headers = [{ source: "/:path*", headers: securityHeaders }];
    if (!indexable) {
      headers.push({ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] });
    }
    // Admin + API are never indexed.
    headers.push({ source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] });
    headers.push({ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] });
    return headers;
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/rmd", destination: "/rmd-calculator", permanent: true },
      { source: "/irmaa", destination: "/irmaa-calculator", permanent: true },
    ];
  },
};

export default nextConfig;
