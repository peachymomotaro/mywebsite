import { JSDOM } from "jsdom";

const CREDIT_PATTERNS = [
  /Producer:\s*Peter\s*Curry/i,
  /Producer\/editor:\s*Peter\s*Curry/i,
  /@petedoeshistory/i,
];

function addEpisodeUrl(set: Set<string>, url?: string) {
  if (!url) {
    return;
  }

  if (!url.includes("/podcast/") || !url.includes("?i=")) {
    return;
  }

  set.add(url.split("?").length > 1 ? url : `${url}?i=`);
}

function extractLinksFromJson(json: unknown, links: Set<string>) {
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
        const nested = (item as Record<string, unknown>).item as Record<string, unknown>;
        addEpisodeUrl(links, String(nested.url || ""));
      }
    });
  }

  if (record.hasPart) {
    extractLinksFromJson(record.hasPart, links);
  }
}

function getDocument(html: string) {
  return new JSDOM(html).window.document;
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

export function extractEpisodeLinks(html: string) {
  const links = new Set<string>();
  const document = getDocument(html);

  document.querySelectorAll<HTMLAnchorElement>("a[href*='/podcast/'][href*='?i=']").forEach((link) => {
    addEpisodeUrl(links, link.getAttribute("href") ?? undefined);
  });

  document.querySelectorAll("script[type='application/ld+json']").forEach((script) => {
    const raw = script.textContent;

    if (!raw) {
      return;
    }

    try {
      extractLinksFromJson(JSON.parse(raw), links);
    } catch {
      // ignore malformed JSON
    }
  });

  return Array.from(links);
}

export function extractEpisodeMetadata(html: string) {
  const document = getDocument(html);
  const title =
    document.querySelector("meta[property='og:title']")?.getAttribute("content") ||
    document.querySelector("title")?.textContent?.trim() ||
    "";

  let date = "";

  document.querySelectorAll("script[type='application/ld+json']").forEach((script) => {
    if (date) {
      return;
    }

    const raw = script.textContent;

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of candidates) {
        if (item && typeof item === "object" && "datePublished" in item) {
          date = String((item as Record<string, unknown>).datePublished);
          break;
        }
      }
    } catch {
      // ignore malformed JSON
    }
  });

  return { title, date };
}

export function extractBodyText(html: string) {
  const document = getDocument(html);

  return normalizeText(document.body?.textContent ?? "");
}

export function extractCreditLine(text: string) {
  for (const pattern of CREDIT_PATTERNS) {
    const match = text.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return "";
}
