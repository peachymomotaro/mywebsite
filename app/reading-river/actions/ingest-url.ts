"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import {
  estimateArticleLengthFromHtml,
  type ArticleLengthEstimate,
  type LengthEstimationConfidence,
  type LengthEstimationMethod,
} from "@/lib/reading-river/article-length-estimation";
import { DEFAULT_READING_SPEED_WPM } from "@/lib/reading-river/reading-config";
import type {
  IntakeFormState,
  UrlIntakeDraftValues,
  UrlIntakeReviewMetadata,
} from "@/lib/reading-river/intake-form-state";
import { readingRiverPath } from "@/lib/reading-river/routes";
import {
  findMatchingSubstackFeedItem,
  getSubstackFeedUrl,
  isSubstackPostUrl,
  parseSubstackFeed,
} from "@/lib/reading-river/substack-feed";

const STREAM_PATH = readingRiverPath();
const FETCHED_DETAILS_REVIEW_MESSAGE =
  "Fetched article details. Review the title and reading time, then save it.";
const REVIEW_ESTIMATE_CONFIRMATION_MESSAGE =
  "I found the article, but the reading time still needs your confirmation before saving.";
const FETCH_FAILED_REVIEW_MESSAGE =
  "I couldn't fetch this page. Review the title and add a reading time before saving it manually.";
const REVIEW_ESTIMATE_REQUIRED_MESSAGE = "Add an estimated reading time before saving this article.";
const INVALID_URL_MESSAGE = "Add a valid link before saving it.";
const FETCH_TIMEOUT_MS = 10_000;

type IngestUrlInput = {
  url: string;
  title?: string | null;
  notes?: string | null;
  priorityScore?: number;
  estimatedMinutes: number;
  tagNames?: string[];
  estimation?: ArticleLengthEstimate | null;
  lengthEstimationMethod: LengthEstimationMethod;
  lengthEstimationConfidence: LengthEstimationConfidence;
};

function normalizeTagNames(tagNames: string[]) {
  return [...new Set(tagNames.map((tagName) => tagName.trim()).filter(Boolean))];
}

function buildTagWrite(userId: string, tagNames: string[]) {
  return {
    create: normalizeTagNames(tagNames).map((name) => ({
      tag: {
        connectOrCreate: {
          where: {
            userId_name: {
              userId,
              name,
            },
          },
          create: {
            userId,
            name,
          },
        },
      },
    })),
  };
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function parsePriorityScore(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEstimatedMinutes(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function buildDraftValues(formData: FormData): UrlIntakeDraftValues {
  const priorityScore = String(formData.get("priorityScore") ?? "").trim();

  return {
    url: String(formData.get("url") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    priorityScore: priorityScore || "5",
    estimatedMinutes: String(formData.get("estimatedMinutes") ?? "").trim(),
    tagNames: String(formData.get("tagNames") ?? "").trim(),
  };
}

function buildReviewMetadata(
  estimation: ArticleLengthEstimate | null,
  {
    fetchSucceeded,
    estimatedMinutesRequired,
    titleWasPrefilled,
  }: {
    fetchSucceeded: boolean;
    estimatedMinutesRequired: boolean;
    titleWasPrefilled: boolean;
  },
): UrlIntakeReviewMetadata {
  return {
    fetchSucceeded,
    estimatedMinutesRequired,
    extractedTitle: estimation?.title ?? null,
    extractedText: estimation?.extractedText ?? null,
    titleWasPrefilled,
    siteName: estimation?.siteName ?? null,
    author: estimation?.author ?? null,
    wordCount: estimation?.wordCount ?? null,
    estimatedMinutes: estimation?.estimatedMinutes ?? null,
    lengthEstimationMethod: estimation?.method ?? "unknown",
    lengthEstimationConfidence: estimation?.confidence ?? "unknown",
  };
}

function buildReviewState({
  draftValues,
  message,
  estimation,
  fetchSucceeded,
  estimatedMinutesRequired,
  previousReviewMetadata,
}: {
  draftValues: UrlIntakeDraftValues;
  message: string;
  estimation: ArticleLengthEstimate | null;
  fetchSucceeded: boolean;
  estimatedMinutesRequired: boolean;
  previousReviewMetadata?: UrlIntakeReviewMetadata;
}): IntakeFormState {
  const shouldReplaceAutoFilledTitle =
    Boolean(previousReviewMetadata?.titleWasPrefilled) &&
    draftValues.title === (previousReviewMetadata?.extractedTitle ?? "");
  const shouldUseExtractedTitle = !draftValues.title || shouldReplaceAutoFilledTitle;
  const titleWasPrefilled = Boolean(estimation?.title) && shouldUseExtractedTitle;
  const resolvedTitle = shouldUseExtractedTitle ? estimation?.title ?? "" : draftValues.title;

  return {
    status: "review",
    message,
    draftValues: {
      ...draftValues,
      title: resolvedTitle,
      estimatedMinutes:
        estimation?.estimatedMinutes !== null && estimation?.estimatedMinutes !== undefined
          ? String(estimation.estimatedMinutes)
          : draftValues.estimatedMinutes,
    },
    reviewMetadata: buildReviewMetadata(estimation, {
      fetchSucceeded,
      estimatedMinutesRequired,
      titleWasPrefilled,
    }),
    submittedAt: Date.now(),
  };
}

function parseTagNames(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasUrlScheme(value: string) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
}

function looksLikeHostStyleUrl(value: string) {
  return /^[^\s/]+\.[^\s]+(?:\/.*)?$/i.test(value);
}

function normalizeSubmittedUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = hasUrlScheme(trimmed)
    ? trimmed
    : looksLikeHostStyleUrl(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    const normalized = new URL(candidate);

    if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
      return null;
    }

    return normalized.toString();
  } catch {
    return null;
  }
}

function buildEstimationFromReviewMetadata(reviewMetadata: UrlIntakeReviewMetadata | undefined) {
  if (!reviewMetadata?.fetchSucceeded) {
    return null;
  }

  return {
    title: reviewMetadata.extractedTitle,
    siteName: reviewMetadata.siteName,
    author: reviewMetadata.author,
    extractedText: reviewMetadata.extractedText,
    wordCount: reviewMetadata.wordCount,
    estimatedMinutes: reviewMetadata.estimatedMinutes,
    isProbablyArticle: reviewMetadata.lengthEstimationConfidence !== "unknown",
    confidence: reviewMetadata.lengthEstimationConfidence,
    method: reviewMetadata.lengthEstimationMethod,
  } satisfies ArticleLengthEstimate;
}

function getFetchErrorDetails(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error && typeof error.cause === "object" && error.cause !== null
      ? error.cause
      : null;

  return {
    errorMessage: message,
    errorCode:
      cause && "code" in cause && typeof cause.code === "string" ? cause.code : undefined,
    hostname:
      cause && "hostname" in cause && typeof cause.hostname === "string"
        ? cause.hostname
        : undefined,
  };
}

function buildFetchOptions() {
  return {
    headers: {
      "User-Agent": "Reading River/0.1 (+https://reading-river.local)",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  } as const;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSubstackFeedArticleHtml({
  siteName,
  title,
  author,
  description,
  contentHtml,
}: {
  siteName: string | null;
  title: string | null;
  author: string | null;
  description: string | null;
  contentHtml: string;
}) {
  const headTags = [
    title ? `<title>${escapeHtml(title)}</title>` : null,
    siteName ? `<meta property="og:site_name" content="${escapeHtml(siteName)}" />` : null,
    author ? `<meta name="author" content="${escapeHtml(author)}" />` : null,
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : null,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html><html><head>${headTags}</head><body>${contentHtml}</body></html>`;
}

async function fetchEstimatedArticleFromUrl(url: string, wordsPerMinute: number) {
  try {
    const response = await fetch(url, buildFetchOptions());

    if (!response.ok) {
      console.warn("Reading time estimation fetch returned a non-OK response.", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const html = await response.text();
    const estimation = await estimateArticleLengthFromHtml({
      url,
      html,
      wordsPerMinute,
    });

    if (estimation.confidence === "low" || estimation.confidence === "unknown") {
      console.warn("Reading time estimation needs manual confirmation.", {
        url,
        confidence: estimation.confidence,
        method: estimation.method,
        wordCount: estimation.wordCount,
        estimatedMinutes: estimation.estimatedMinutes,
      });
    }

    return estimation;
  } catch (error) {
    console.warn("Reading time estimation fetch failed.", {
      url,
      ...getFetchErrorDetails(error),
    });
    return null;
  }
}

async function fetchEstimatedArticleFromSubstackFeed(url: string, wordsPerMinute: number) {
  const feedUrl = getSubstackFeedUrl(url);

  if (!feedUrl) {
    return null;
  }

  try {
    const response = await fetch(feedUrl, buildFetchOptions());

    if (!response.ok) {
      console.warn("Reading time estimation Substack feed returned a non-OK response.", {
        feedUrl,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const xml = await response.text();
    const feed = await parseSubstackFeed(xml);
    const item = findMatchingSubstackFeedItem(feed, url);

    if (!item?.contentHtml) {
      return null;
    }

    const html = buildSubstackFeedArticleHtml({
      siteName: feed.siteName,
      title: item.title,
      author: item.author,
      description: item.description,
      contentHtml: item.contentHtml,
    });
    const estimation = await estimateArticleLengthFromHtml({
      url: item.url,
      html,
      wordsPerMinute,
    });

    return {
      ...estimation,
      title: item.title ?? estimation.title,
      siteName: feed.siteName ?? estimation.siteName,
      author: item.author ?? estimation.author,
    };
  } catch (error) {
    console.warn("Reading time estimation Substack feed failed.", {
      feedUrl,
      ...getFetchErrorDetails(error),
    });
    return null;
  }
}

async function fetchExtractedArticle(url: string, userId: string) {
  const prisma = getPrismaClient();
  const settings = await prisma.appSettings.findUnique({
    where: { userId },
    select: { defaultReadingSpeedWpm: true },
  });
  const wordsPerMinute =
    settings?.defaultReadingSpeedWpm && settings.defaultReadingSpeedWpm > 0
      ? settings.defaultReadingSpeedWpm
      : DEFAULT_READING_SPEED_WPM;
  const directEstimation = await fetchEstimatedArticleFromUrl(url, wordsPerMinute);

  if (!isSubstackPostUrl(url)) {
    return directEstimation;
  }

  if (directEstimation === null) {
    return fetchEstimatedArticleFromSubstackFeed(url, wordsPerMinute);
  }

  if (
    directEstimation.confidence === "high" ||
    directEstimation.confidence === "medium"
  ) {
    return directEstimation;
  }

  return (await fetchEstimatedArticleFromSubstackFeed(url, wordsPerMinute)) ?? directEstimation;
}

export async function ingestUrl(input: IngestUrlInput, userId?: string) {
  const prisma = getPrismaClient();
  const currentUserId = userId ?? (await requireCurrentUser()).id;
  const url = input.url.trim();
  const estimation = input.estimation ?? null;
  const fallbackTitle = normalizeOptionalString(input.title) ?? url;

  const item = await prisma.readingItem.create({
    data: {
      userId: currentUserId,
      title: normalizeOptionalString(input.title) ?? estimation?.title ?? fallbackTitle,
      sourceType: "url",
      sourceUrl: url,
      notes: normalizeOptionalString(input.notes),
      estimatedMinutes: input.estimatedMinutes,
      priorityScore: input.priorityScore ?? 5,
      status: "unread",
      siteName: estimation?.siteName ?? null,
      author: estimation?.author ?? null,
      extractedText: estimation?.extractedText ?? null,
      wordCount: estimation?.wordCount ?? null,
      lengthEstimationMethod: input.lengthEstimationMethod,
      lengthEstimationConfidence: input.lengthEstimationConfidence,
      tags: buildTagWrite(currentUserId, input.tagNames ?? []),
    },
  });

  revalidatePath(STREAM_PATH);

  return item;
}

export async function submitUrlIntake(
  previousState: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const draftValues = buildDraftValues(formData);
  const normalizedUrl = normalizeSubmittedUrl(draftValues.url);

  if (!normalizedUrl) {
    return {
      status: "error",
      message: INVALID_URL_MESSAGE,
      draftValues,
      submittedAt: Date.now(),
    };
  }

  draftValues.url = normalizedUrl;

  const url = normalizedUrl;
  const titleOverride = draftValues.title;
  const notes = draftValues.notes;
  const priorityScore = parsePriorityScore(draftValues.priorityScore, 5);
  const estimatedMinutes = parseEstimatedMinutes(draftValues.estimatedMinutes);
  const tagNames = parseTagNames(draftValues.tagNames);
  const fallbackTitle = titleOverride || url;

  try {
    const currentUser = await requireCurrentUser();

    const isSubmittingSameReviewedUrl =
      previousState.status === "review" && previousState.draftValues?.url === url;

    if (isSubmittingSameReviewedUrl) {
      const reviewMetadata = previousState.reviewMetadata;
      const estimation = buildEstimationFromReviewMetadata(reviewMetadata);
      const extractedEstimatedMinutes = reviewMetadata?.estimatedMinutes ?? null;
      const effectiveEstimatedMinutes = estimatedMinutes ?? extractedEstimatedMinutes;

      if ((reviewMetadata?.estimatedMinutesRequired ?? true) && estimatedMinutes === null) {
        return buildReviewState({
          draftValues,
          message: REVIEW_ESTIMATE_REQUIRED_MESSAGE,
          estimation,
          fetchSucceeded: reviewMetadata?.fetchSucceeded ?? false,
          estimatedMinutesRequired: reviewMetadata?.estimatedMinutesRequired ?? true,
          previousReviewMetadata: reviewMetadata,
        });
      }

      if (effectiveEstimatedMinutes === null) {
        return buildReviewState({
          draftValues,
          message: REVIEW_ESTIMATE_REQUIRED_MESSAGE,
          estimation,
          fetchSucceeded: reviewMetadata?.fetchSucceeded ?? false,
          estimatedMinutesRequired: true,
          previousReviewMetadata: reviewMetadata,
        });
      }

      const estimateWasEdited =
        estimatedMinutes !== null &&
        extractedEstimatedMinutes !== null &&
        estimatedMinutes !== extractedEstimatedMinutes;
      const shouldSaveAsManual =
        !reviewMetadata?.fetchSucceeded ||
        reviewMetadata?.estimatedMinutesRequired ||
        estimation === null ||
        extractedEstimatedMinutes === null ||
        estimateWasEdited;
      const item = await ingestUrl(
        {
          url,
          title: titleOverride,
          notes,
          priorityScore,
          estimatedMinutes: effectiveEstimatedMinutes,
          tagNames,
          estimation,
          lengthEstimationMethod: shouldSaveAsManual ? "manual" : estimation.method,
          lengthEstimationConfidence: shouldSaveAsManual ? "unknown" : estimation.confidence,
        },
        currentUser.id,
      );

      return {
        status: "success",
        message: `Added "${item.title || fallbackTitle}" to the stream.`,
        savedTitle: item.title || fallbackTitle,
        submittedAt: Date.now(),
      };
    }

    const estimation = await fetchExtractedArticle(url, currentUser.id);

    if (estimation === null) {
      return buildReviewState({
        draftValues,
        message: FETCH_FAILED_REVIEW_MESSAGE,
        estimation: null,
        fetchSucceeded: false,
        estimatedMinutesRequired: true,
        previousReviewMetadata:
          previousState.status === "review" ? previousState.reviewMetadata : undefined,
      });
    }

    const estimatedMinutesNeedsConfirmation =
      estimation.estimatedMinutes === null ||
      estimation.estimatedMinutes === undefined ||
      estimation.confidence === "low" ||
      estimation.confidence === "unknown";

    return buildReviewState({
      draftValues,
      message: estimatedMinutesNeedsConfirmation
        ? REVIEW_ESTIMATE_CONFIRMATION_MESSAGE
        : FETCHED_DETAILS_REVIEW_MESSAGE,
      estimation,
      fetchSucceeded: true,
      estimatedMinutesRequired: estimatedMinutesNeedsConfirmation,
      previousReviewMetadata:
        previousState.status === "review" ? previousState.reviewMetadata : undefined,
    });
  } catch (error) {
    unstable_rethrow(error);

    console.error("Reading River URL intake failed.", {
      url,
      ...getFetchErrorDetails(error),
    });

    return {
      status: "error",
      message: "Couldn't add that link. Try again.",
      submittedAt: Date.now(),
    };
  }
}
