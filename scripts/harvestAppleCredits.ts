import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

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

const CREDIT_PATTERNS = [
  /Producer:\s*Peter\s*Curry/i,
  /Producer\/editor:\s*Peter\s*Curry/i,
  /@petedoeshistory/i
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

const normalizeText = (value: string) =>
  value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

const addEpisodeUrl = (set: Set<string>, url?: string) => {
  if (!url) {
    return;
  }
  if (!url.includes("/podcast/") || !url.includes("?i=")) {
    return;
  }
  set.add(url.split("?").length > 1 ? url : `${url}?i=`);
};

const extractLinksFromJson = (json: unknown, links: Set<string>) => {
  if (!json) {
    return;
  }

  if (Array.isArray(json)) {
    json.forEach((entry) => extractLinksFromJson(entry, links));
    return;
  }

  if (typeof json !== "object") {
    return;
  }

  const record = json as Record<string, unknown>;
  const itemList = record.itemListElement;
  if (Array.isArray(itemList)) {
    itemList.forEach((item) => {
      if (typeof item === "object" && item && "url" in item) {
        addEpisodeUrl(links, String((item as Record<string, unknown>).url));
      }
      if (
        typeof item === "object" &&
        item &&
        "item" in item &&
        typeof (item as Record<string, unknown>).item === "object"
      ) {
        const nested = (item as Record<string, unknown>).item as Record<
          string,
          unknown
        >;
        addEpisodeUrl(links, String(nested.url || ""));
      }
    });
  }

  if (record.hasPart) {
    extractLinksFromJson(record.hasPart, links);
  }
};

const extractEpisodeLinks = (html: string) => {
  const links = new Set<string>();
  const $ = cheerio.load(html);

  $("a[href*='/podcast/'][href*='?i=']").each((_, element) => {
    addEpisodeUrl(links, $(element).attr("href"));
  });

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).text();
    if (!raw) {
      return;
    }
    try {
      const json = JSON.parse(raw);
      extractLinksFromJson(json, links);
    } catch {
      // ignore malformed JSON
    }
  });

  return Array.from(links);
};

const extractEpisodeMetadata = (html: string) => {
  const $ = cheerio.load(html);
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text().trim();

  let date = "";
  let jsonDate = "";

  $("script[type='application/ld+json']").each((_, element) => {
    if (jsonDate) {
      return;
    }
    const raw = $(element).text();
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        if (item && typeof item === "object" && "datePublished" in item) {
          jsonDate = String((item as Record<string, unknown>).datePublished);
          break;
        }
      }
    } catch {
      // ignore
    }
  });

  if (jsonDate) {
    date = jsonDate;
  }

  return { title, date };
};

const extractCreditLine = (text: string) => {
  for (const pattern of CREDIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return "";
};

const harvestShow = async (show: (typeof SHOWS)[number]) => {
  const showHtml = await fetchHtml(show.url);
  const episodeLinks = extractEpisodeLinks(showHtml);
  const episodes: Array<{ title: string; url: string; date?: string; creditLine?: string }> = [];

  for (const episodeUrl of episodeLinks) {
    await sleep(450);
    try {
      const episodeHtml = await fetchHtml(episodeUrl);
      const text = normalizeText(cheerio.load(episodeHtml)("body").text());
      if (!CREDIT_PATTERNS.some((pattern) => pattern.test(text))) {
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
