import type { NextConfig } from "next";
import pkg from "./package.json";

/**
 * Security headers for every response.
 *
 * No script-src CSP: Next.js inline scripts would need a per-request nonce,
 * which makes every page dynamic and turns off static prerendering. The CSP
 * below only blocks framing, plugins and <base> hijacking, which is safe with
 * Clerk and Next.js.
 *
 * Referrer-Policy also keeps Clerk's dev-browser token (`__clerk_db_jwt`, which
 * can appear in the URL) out of Referer headers sent to other origins.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Keep screen-wake-lock (phrasebook show-card) and WebAuthn (Clerk passkeys) allowed.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
  },
];

/**
 * Clips for phrases added from the phrasebook live in Vercel Blob. Serving them
 * at /audio/added/ keeps them same-origin, so the service worker saves them for
 * offline like the built-in clips. The store id is part of its token.
 */
const blobStore = /^vercel_blob_rw_([a-z\d]+)_/i.exec(process.env.BLOB_READ_WRITE_TOKEN ?? "")?.[1]?.toLowerCase();

const nextConfig: NextConfig = {
  // Shown, very quietly, at the bottom of the home screen. Vercel sets the commit.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7),
  },
  cacheComponents: true,
  devIndicators: false,
  partialPrefetching: true,
  poweredByHeader: false,
  async rewrites() {
    if (!blobStore) return [];
    return [
      { source: "/audio/added/:file", destination: `https://${blobStore}.public.blob.vercel-storage.com/phrases/:file` },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must never be served stale, or a deploy could strand old clients.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
