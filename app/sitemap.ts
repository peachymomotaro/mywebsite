import type { MetadataRoute } from "next";

const siteUrl = "https://petercurry.org";

const routes = [
  "/",
  "/about",
  "/blog",
  "/projects",
  "/podcasts",
  "/contact",
  "/privacy",
  "/reading-river/beta",
  "/reading-river/how-it-works",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
  }));
}
