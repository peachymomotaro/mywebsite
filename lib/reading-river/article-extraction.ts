import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
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

function extractReadableText(contentHtml: string | null | undefined) {
  if (!contentHtml) {
    return null;
  }

  const fragment = new JSDOM(`<body>${contentHtml}</body>`).window.document.body;
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
): ExtractedArticle {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const probablyArticle = isProbablyReaderable(document);
  const parsed = new Readability(document).parse();
  const extractedText = extractReadableText(parsed?.content) ?? normalizeText(parsed?.textContent);
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
}
