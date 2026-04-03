import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { loadJSDOM } from "@/lib/reading-river/load-jsdom";
import { estimateReadingTime } from "@/lib/reading-river/reading-time";
import { countWords, normalizeText } from "@/lib/reading-river/word-count";

export type ExtractedArticle = {
  title: string | null;
  siteName: string | null;
  author: string | null;
  extractedText: string | null;
  wordCount: number | null;
  estimatedMinutes: number | null;
  isProbablyArticle: boolean;
};

function getMetaContent(document: Document, ...selectors: string[]) {
  for (const selector of selectors) {
    const content = document.querySelector(selector)?.getAttribute("content")?.trim();

    if (content) {
      return content;
    }
  }

  return null;
}

function getFallbackMetaContent(html: string, ...patterns: RegExp[]) {
  for (const pattern of patterns) {
    const matched = html.match(pattern)?.groups?.content;
    const normalized = normalizeText(matched);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function buildFallbackArticle(url: string, html: string): ExtractedArticle {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const title =
    getFallbackMetaContent(
      html,
      /<meta[^>]+property=["']og:title["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
      /<title[^>]*>(?<content>[\s\S]*?)<\/title>/i,
    ) ?? hostname;
  const siteName =
    getFallbackMetaContent(
      html,
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']application-name["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
    ) ?? hostname;
  const author = getFallbackMetaContent(
    html,
    /<meta[^>]+name=["']author["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["'](?<content>[^"']+)["'][^>]*>/i,
  );

  return {
    title,
    siteName,
    author,
    extractedText: null,
    wordCount: null,
    estimatedMinutes: null,
    isProbablyArticle: false,
  };
}

function extractReadableText(document: Document, contentHtml: string | null | undefined) {
  if (!contentHtml) {
    return null;
  }

  const fragment = document.createElement("div");

  fragment.innerHTML = contentHtml;
  const blockNodes = fragment.querySelectorAll(
    "p, li, blockquote, pre, h1, h2, h3, h4, h5, h6",
  );

  if (blockNodes.length > 0) {
    return normalizeText(
      Array.from(blockNodes)
        .map((node) => node.textContent ?? "")
        .join(" "),
    );
  }

  return normalizeText(fragment.textContent);
}

export function extractArticleFromHtml(
  url: string,
  html: string,
  wordsPerMinute?: number,
): Promise<ExtractedArticle> {
  return extractArticleFromHtmlInternal(url, html, wordsPerMinute);
}

async function extractArticleFromHtmlInternal(
  url: string,
  html: string,
  wordsPerMinute?: number,
): Promise<ExtractedArticle> {
  try {
    const JSDOM = await loadJSDOM();
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    const probablyArticle = isProbablyReaderable(document);
    const parsed = new Readability(document).parse();
    const extractedText =
      extractReadableText(document, parsed?.content) ?? normalizeText(parsed?.textContent);
    const wordCount = countWords(extractedText);
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    return {
      title:
        normalizeText(parsed?.title) ??
        getMetaContent(document, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ??
        normalizeText(document.title) ??
        hostname,
      siteName:
        normalizeText(parsed?.siteName) ??
        getMetaContent(document, 'meta[property="og:site_name"]', 'meta[name="application-name"]') ??
        hostname,
      author:
        normalizeText(parsed?.byline) ??
        getMetaContent(document, 'meta[name="author"]', 'meta[property="article:author"]'),
      extractedText,
      wordCount,
      estimatedMinutes:
        wordCount === null
          ? null
          : wordsPerMinute === undefined
            ? estimateReadingTime(wordCount)
            : estimateReadingTime(wordCount, wordsPerMinute),
      isProbablyArticle: probablyArticle && Boolean(parsed?.content) && wordCount !== null,
    };
  } catch {
    return buildFallbackArticle(url, html);
  }
}
