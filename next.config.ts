import type { NextConfig } from "next";

/**
 * Afterhand is a fully static site: every route is prerendered at build time and
 * served from the CDN, so there is no server runtime to protect or to pay for.
 *
 * That shapes the choices here.
 *
 * There is deliberately no middleware. Middleware on Vercel runs as a function
 * on every matched request, which would turn a site that currently costs
 * nothing but bandwidth into one that bills an invocation per page view. The
 * headers below are compiled into the CDN routing table instead, so they cost
 * nothing to apply.
 *
 * There is likewise no application level rate limiting, because there is no
 * endpoint to limit. Abuse protection belongs at the edge, in front of the
 * static assets. See the deployment notes in the README for the Vercel side.
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * A Content Security Policy sized for a static export.
 *
 * A nonce based script policy would need middleware to generate the nonce per
 * request, which is exactly the per invocation cost this project avoids. So the
 * policy keeps the directives that are still worth having without one: nothing
 * loads from another origin, the page cannot be framed, and forms cannot be
 * pointed somewhere else.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inlines its hydration bootstrap, which needs unsafe-inline without a nonce.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and Framer Motion both write inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The app asks for none of these, so none of them are granted.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /**
         * The generated icons, the manifest, and the Open Graph card change
         * only when the site is redeployed, but Next serves them with
         * must-revalidate by default. That makes every visitor revalidate a
         * 75 KB PNG they already hold. Caching them at the CDN and allowing a
         * stale copy while it refreshes removes that round trip.
         */
        source: "/:path(opengraph-image|apple-icon|icon.svg|manifest.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // robots and the sitemap are rebuilt with the site and read by crawlers.
        source: "/:path(robots.txt|sitemap.xml)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
