import type { MetadataRoute } from "next";

const baseUrl = "https://petercurry.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/pops", "/api/pops", "/qb", "/api/qb"],
      },
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
