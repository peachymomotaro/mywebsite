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

function extractTextFromElement(root: Element | null | undefined) {
  if (!root) {
    return null;
  }

  const clonedRoot = root.cloneNode(true) as Element;

  clonedRoot
    .querySelectorAll("script, style, noscript, nav, footer, aside, form, button, svg")
    .forEach((node) => node.remove());

  const blockNodes = clonedRoot.querySelectorAll(
    "p, li, blockquote, pre, h1, h2, h3, h4, h5, h6",
  );

  if (blockNodes.length > 0) {
    return normalizeText(
      Array.from(blockNodes)
        .map((node) => node.textContent ?? "")
        .join(" "),
    );
  }

  return normalizeText(clonedRoot.textContent);
}

function getReadableRoot(document: Document) {
  const candidates = [
    document.querySelector("article"),
    document.querySelector("main article"),
    document.querySelector("main"),
    document.querySelector('[role="main"]'),
    document.body,
  ];

  let bestRoot: Element | HTMLBodyElement | null = null;
  let bestWordCount = 0;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const extractedText = extractTextFromElement(candidate);
    const wordCount = countWords(extractedText) ?? 0;

    if (wordCount > bestWordCount) {
      bestRoot = candidate;
      bestWordCount = wordCount;
    }

    if (wordCount >= 80) {
      return candidate;
    }
  }

  return bestRoot;
}

function detectProbableArticle(
  document: Document,
  root: Element | HTMLBodyElement | null,
  wordCount: number | null,
) {
  if (!root || wordCount === null || wordCount < 20) {
    return false;
  }

  if (root.matches("article") || root.querySelector("article")) {
    return true;
  }

  if (
    document.querySelector(
      'meta[property="og:type"][content*="article" i], meta[name="author"], meta[property="article:author"]',
    )
  ) {
    return wordCount >= 80;
  }

  const paragraphCount = root.querySelectorAll("p").length;

  return paragraphCount >= 2 && wordCount >= 80;
}

export function extractArticleFromHtml(
  url: string,
  html: string,
  wordsPerMinute?: number,
): ExtractedArticle {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const readableRoot = getReadableRoot(document);
  const extractedText = extractTextFromElement(readableRoot);
  const wordCount = countWords(extractedText);
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const probablyArticle = detectProbableArticle(document, readableRoot, wordCount);

  return {
    title:
      getMetaContent(document, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ??
      normalizeText(document.title) ??
      hostname,
    siteName:
      getMetaContent(document, 'meta[property="og:site_name"]', 'meta[name="application-name"]') ??
      hostname,
    author:
      getMetaContent(document, 'meta[name="author"]', 'meta[property="article:author"]'),
    extractedText,
    wordCount,
    estimatedMinutes:
      wordCount === null
        ? null
        : wordsPerMinute === undefined
          ? estimateReadingTime(wordCount)
          : estimateReadingTime(wordCount, wordsPerMinute),
    isProbablyArticle: probablyArticle,
  };
}
