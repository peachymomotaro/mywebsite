import type { NextConfig } from "next";

// Reading River runs as its own Vercel project (github.com/peachymomotaro/reading-river)
// and is served here as a "zone": these paths are forwarded to it, so readers,
// sign-ins and the browser extensions keep using petercurry.org.
const READING_RIVER_URL = process.env.READING_RIVER_ZONE_URL ?? "https://reading-river.vercel.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/reading-river", destination: `${READING_RIVER_URL}/reading-river` },
      { source: "/reading-river/:path+", destination: `${READING_RIVER_URL}/reading-river/:path+` },
      { source: "/api/reading-river/:path+", destination: `${READING_RIVER_URL}/api/reading-river/:path+` },
      { source: "/reading-river-static/:path+", destination: `${READING_RIVER_URL}/reading-river-static/:path+` },
    ];
  },
  async redirects() {
    return [
      { source: "/escape-from-max", destination: "/max-danger", permanent: true },
      { source: "/ladder", destination: "/summit", permanent: false },
    ];
  },
  async headers() {
    return [{
      source: "/pops/oauth/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }, {
      source: "/max-danger",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/complexity-lab",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      // Summit is in trial: reachable by link, kept out of search.
      source: "/summit",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }, {
      source: "/api/summit",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }];
  },
  // The Summit API reads its puzzles from disk at request time.
  outputFileTracingIncludes: {
    "/api/summit": ["./data/summit/**/*"],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
