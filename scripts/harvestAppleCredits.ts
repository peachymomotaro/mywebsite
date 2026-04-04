import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractBodyText,
  extractCreditLine,
  extractEpisodeLinks,
  extractEpisodeMetadata,
} from "@/lib/apple-credits-parser";

const SHOWS = [
  {
    slug: "hidden-histories",
    url: "https://podcasts.apple.com/gb/podcast/hidden-histories/id1454513867"
  },
  {
    slug: "killing-time",
    url: "https://podcasts.apple.com/gb/podcast/killing-time-with-rebecca-rideal/id1507389410"
  }
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchHtml = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
};

const harvestShow = async (show: (typeof SHOWS)[number]) => {
  const showHtml = await fetchHtml(show.url);
  const episodeLinks = extractEpisodeLinks(showHtml);
  const episodes: Array<{ title: string; url: string; date?: string; creditLine?: string }> = [];

  for (const episodeUrl of episodeLinks) {
    await sleep(450);
    try {
      const episodeHtml = await fetchHtml(episodeUrl);
      const text = extractBodyText(episodeHtml);
      if (!extractCreditLine(text)) {
        continue;
      }

      const meta = extractEpisodeMetadata(episodeHtml);
      episodes.push({
        title: meta.title || "Untitled episode",
        url: episodeUrl,
        date: meta.date || undefined,
        creditLine: extractCreditLine(text) || undefined
      });
    } catch (error) {
      console.error(`Skipping ${episodeUrl}:`, error instanceof Error ? error.message : error);
    }
  }

  return episodes;
};

const run = async () => {
  const output: Record<string, unknown> = {};

  for (const show of SHOWS) {
    console.log(`Harvesting ${show.slug}...`);
    try {
      output[show.slug] = await harvestShow(show);
    } catch (error) {
      console.error(`Failed ${show.slug}:`, error instanceof Error ? error.message : error);
      output[show.slug] = [];
    }
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "..", "data", "podcastCredits.generated.json");

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${outputPath}`);
};

run();
