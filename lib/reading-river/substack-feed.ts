import Parser from "rss-parser";

export type SubstackFeedItem = {
  title: string | null;
  description: string | null;
  author: string | null;
  url: string;
  contentHtml: string | null;
};

export type SubstackFeed = {
  siteName: string | null;
  items: SubstackFeedItem[];
};

type ParsedFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  description?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  "dc:creator"?: string;
};

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function tryParseUrl(rawUrl: string) {
  if (!URL.canParse(rawUrl)) {
    return null;
  }

  return new URL(rawUrl);
}

export function normalizeSubstackPostUrl(rawUrl: string) {
  const url = tryParseUrl(rawUrl);

  if (!url) {
    return null;
  }

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}

export function isSubstackPostUrl(rawUrl: string) {
  const url = tryParseUrl(rawUrl);

  if (!url || !url.hostname.endsWith(".substack.com")) {
    return false;
  }

  return /^\/p\/[^/]+\/?$/.test(url.pathname);
}

export function getSubstackFeedUrl(rawUrl: string) {
  const url = tryParseUrl(rawUrl);

  if (!url || !isSubstackPostUrl(rawUrl)) {
    return null;
  }

  return `${url.origin}/feed`;
}

function getParser() {
  return new Parser<unknown, ParsedFeedItem>({
    customFields: {
      item: ["content:encoded", "dc:creator"],
    },
  });
}

export async function parseSubstackFeed(xml: string): Promise<SubstackFeed> {
  const parsed = await getParser().parseString(xml);

  return {
    siteName: normalizeOptionalString(parsed.title),
    items: (parsed.items ?? [])
      .map((item) => {
        const url = normalizeSubstackPostUrl(item.link ?? item.guid ?? "");

        if (!url) {
          return null;
        }

        return {
          title: normalizeOptionalString(item.title),
          description: normalizeOptionalString(
            item.description ?? item.contentSnippet ?? item.content,
          ),
          author: normalizeOptionalString(item["dc:creator"]),
          url,
          contentHtml: normalizeOptionalString(item["content:encoded"]),
        } satisfies SubstackFeedItem;
      })
      .filter((item): item is SubstackFeedItem => item !== null),
  };
}

export function findMatchingSubstackFeedItem(feed: SubstackFeed, rawUrl: string) {
  const normalizedTarget = normalizeSubstackPostUrl(rawUrl);

  if (!normalizedTarget) {
    return null;
  }

  return feed.items.find((item) => item.url === normalizedTarget) ?? null;
}
