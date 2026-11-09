import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/escape-from-max", destination: "/max-danger", permanent: true }];
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
    }];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
