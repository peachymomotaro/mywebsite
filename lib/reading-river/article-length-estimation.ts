import { extractArticleFromHtml, type ExtractedArticle } from "@/lib/reading-river/article-extraction";
import { loadJSDOM } from "@/lib/reading-river/load-jsdom";
import { estimateReadingTime } from "@/lib/reading-river/reading-time";
import { countWords, normalizeText } from "@/lib/reading-river/word-count";

export type LengthEstimationConfidence = "high" | "medium" | "low" | "unknown";
export type LengthEstimationMethod =
  | "schema_wordCount"
  | "schema_timeRequired"
  | "schema_articleBody"
  | "readability"
  | "trafilatura"
  | "manual"
  | "unknown";

export type ArticleLengthEstimate = ExtractedArticle & {
  confidence: LengthEstimationConfidence;
  method: LengthEstimationMethod;
};

const MIN_REASONABLE_WORD_COUNT = 80;
const MAX_HIGH_CONFIDENCE_WORD_COUNT = 50_000;
const MAX_REASONABLE_WORD_COUNT = 100_000;
const MAX_REASONABLE_MINUTES = 720;

const STRUCTURED_SELECTORS = {
  wordCount: [
    'meta[itemprop="wordCount"]',
    '[itemprop="wordCount"]',
    'meta[name="wordCount"]',
    'meta[property="wordCount"]',
    'meta[property="article:wordCount"]',
  ],
  timeRequired: [
    'meta[itemprop="timeRequired"]',
    '[itemprop="timeRequired"]',
    'meta[name="timeRequired"]',
    'meta[property="timeRequired"]',
  ],
  articleBody: ['meta[itemprop="articleBody"]', '[itemprop="articleBody"]'],
} as const;

function buildResult(
  base: ExtractedArticle,
  overrides: Partial<Pick<ArticleLengthEstimate, "extractedText" | "wordCount" | "estimatedMinutes">> &
    Pick<ArticleLengthEstimate, "confidence" | "method">,
): ArticleLengthEstimate {
  return {
    title: base.title,
    siteName: base.siteName,
    author: base.author,
    extractedText: base.extractedText,
    wordCount: base.wordCount,
    estimatedMinutes: base.estimatedMinutes,
    isProbablyArticle: base.isProbablyArticle,
    ...overrides,
  };
}

function flattenJsonLd(value: unknown, output: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenJsonLd(entry, output));
    return output;
  }

  if (!value || typeof value !== "object") {
    return output;
  }

  const objectValue = value as Record<string, unknown>;

  output.push(objectValue);

  if (objectValue["@graph"] !== undefined) {
    flattenJsonLd(objectValue["@graph"], output);
  }

  return output;
}

function parseJsonLd(document: Document) {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap(
    (node) => {
      const raw = node.textContent?.trim();

      if (!raw) {
        return [];
      }

      try {
        return flattenJsonLd(JSON.parse(raw));
      } catch {
        return [];
      }
    },
  );
}

function getElementValue(element: Element) {
  return (
    element.getAttribute("content") ??
    element.getAttribute("datetime") ??
    element.textContent ??
    ""
  );
}

function collectStructuredFieldValues(
  document: Document,
  fieldName: keyof typeof STRUCTURED_SELECTORS,
) {
  const selector = STRUCTURED_SELECTORS[fieldName].join(", ");
  const jsonLdValues = parseJsonLd(document).flatMap((entry) => {
    const raw = entry[fieldName];

    return Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
  });
  const selectorValues = Array.from(document.querySelectorAll(selector))
    .map((element) => getElementValue(element))
    .filter(Boolean);

  return [...jsonLdValues, ...selectorValues];
}

function parseWordCountCandidate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);

    return rounded > 0 ? rounded : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const matched = value.trim().match(/\d[\d,]*/)?.[0];

  if (!matched) {
    return null;
  }

  const parsed = Number(matched.replaceAll(",", ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);

  return rounded > 0 ? rounded : null;
}

function parseTimeRequiredCandidate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);

    return rounded > 0 ? rounded : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(
    /^P(?:(?<days>\d+)D)?(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?)?$/i,
  );

  if (isoMatch?.groups) {
    const days = Number(isoMatch.groups.days ?? 0);
    const hours = Number(isoMatch.groups.hours ?? 0);
    const minutes = Number(isoMatch.groups.minutes ?? 0);
    const totalMinutes = days * 24 * 60 + hours * 60 + minutes;

    return totalMinutes > 0 ? totalMinutes : null;
  }

  const naturalLanguageMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes)\b/i);

  if (naturalLanguageMatch) {
    const parsed = Number(naturalLanguageMatch[1]);

    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseStructuredWordCount(document: Document) {
  for (const candidate of collectStructuredFieldValues(document, "wordCount")) {
    const parsed = parseWordCountCandidate(candidate);

    if (parsed !== null && parsed >= MIN_REASONABLE_WORD_COUNT && parsed <= MAX_REASONABLE_WORD_COUNT) {
      return parsed;
    }
  }

  return null;
}

function parseStructuredTimeRequired(document: Document) {
  for (const candidate of collectStructuredFieldValues(document, "timeRequired")) {
    const parsed = parseTimeRequiredCandidate(candidate);

    if (parsed !== null && parsed <= MAX_REASONABLE_MINUTES) {
      return parsed;
    }
  }

  return null;
}

function parseStructuredArticleBody(document: Document) {
  for (const candidate of collectStructuredFieldValues(document, "articleBody")) {
    const normalized = normalizeText(
      typeof candidate === "string" ? candidate : typeof candidate === "number" ? String(candidate) : null,
    );

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function classifyStructuredArticleBody(wordCount: number): LengthEstimationConfidence {
  return wordCount >= MIN_REASONABLE_WORD_COUNT && wordCount <= MAX_HIGH_CONFIDENCE_WORD_COUNT
    ? "high"
    : "low";
}

function classifyReadability(
  wordCount: number,
  isProbablyArticle: boolean,
): LengthEstimationConfidence {
  if (!isProbablyArticle && wordCount < MIN_REASONABLE_WORD_COUNT) {
    return "unknown";
  }

  if (wordCount < MIN_REASONABLE_WORD_COUNT || wordCount > MAX_HIGH_CONFIDENCE_WORD_COUNT) {
    return isProbablyArticle ? "low" : "unknown";
  }

  return isProbablyArticle ? "medium" : "low";
}

function getErrorDetails(error: unknown) {
  return {
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

export async function estimateArticleLengthFromHtml({
  url,
  html,
  wordsPerMinute,
}: {
  url: string;
  html: string;
  wordsPerMinute: number;
}): Promise<ArticleLengthEstimate> {
  const readabilityResult = await extractArticleFromHtml(url, html, wordsPerMinute);

  let document: Document;

  try {
    const JSDOM = await loadJSDOM();
    const dom = new JSDOM(html, { url });

    document = dom.window.document;
  } catch (error) {
    console.warn("Reading time estimation parsing failed.", {
      url,
      ...getErrorDetails(error),
    });

    return buildResult(readabilityResult, {
      extractedText: null,
      wordCount: null,
      estimatedMinutes: null,
      confidence: "unknown",
      method: "unknown",
    });
  }

  const structuredWordCount = parseStructuredWordCount(document);

  if (structuredWordCount !== null) {
    return buildResult(readabilityResult, {
      wordCount: structuredWordCount,
      estimatedMinutes: estimateReadingTime(structuredWordCount, wordsPerMinute),
      confidence: "high",
      method: "schema_wordCount",
    });
  }

  const structuredTimeRequired = parseStructuredTimeRequired(document);

  if (structuredTimeRequired !== null) {
    return buildResult(readabilityResult, {
      wordCount: structuredTimeRequired * wordsPerMinute,
      estimatedMinutes: structuredTimeRequired,
      confidence: "high",
      method: "schema_timeRequired",
    });
  }

  const structuredArticleBody = parseStructuredArticleBody(document);

  if (structuredArticleBody) {
    const wordCount = countWords(structuredArticleBody);

    if (wordCount !== null) {
      return buildResult(readabilityResult, {
        extractedText: structuredArticleBody,
        wordCount,
        estimatedMinutes: estimateReadingTime(wordCount, wordsPerMinute),
        confidence: classifyStructuredArticleBody(wordCount),
        method: "schema_articleBody",
      });
    }
  }

  if (readabilityResult.wordCount === null || readabilityResult.estimatedMinutes === null) {
    return buildResult(readabilityResult, {
      extractedText: null,
      wordCount: null,
      estimatedMinutes: null,
      confidence: "unknown",
      method: "unknown",
    });
  }

  const confidence = classifyReadability(
    readabilityResult.wordCount,
    readabilityResult.isProbablyArticle,
  );

  if (confidence === "unknown") {
    return buildResult(readabilityResult, {
      extractedText: null,
      wordCount: null,
      estimatedMinutes: null,
      confidence: "unknown",
      method: "unknown",
    });
  }

  return buildResult(readabilityResult, {
    confidence,
    method: "readability",
  });
}
