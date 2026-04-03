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
import type { IntakeFormState, UrlIntakeDraftValues } from "@/lib/reading-river/intake-form-state";
import { readingRiverPath } from "@/lib/reading-river/routes";

const STREAM_PATH = readingRiverPath();
const URL_ESTIMATE_REQUIRED_MESSAGE =
  "I couldn't estimate reading time confidently for that link. Add or adjust your best guess before saving it.";
const FETCH_FAILED_CONFIRM_MESSAGE =
  "I couldn't fetch this page. It may not exist, or it may block automated access. You can still add it manually if you want to proceed.";
const MANUAL_ESTIMATE_REQUIRED_MESSAGE =
  "Add an estimated reading time before saving this link manually.";
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

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Reading River/0.1 (+https://reading-river.local)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

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
      siteName: input.lengthEstimationMethod === "manual" ? null : estimation?.siteName ?? null,
      author: input.lengthEstimationMethod === "manual" ? null : estimation?.author ?? null,
      extractedText:
        input.lengthEstimationMethod === "manual" ? null : estimation?.extractedText ?? null,
      wordCount: input.lengthEstimationMethod === "manual" ? null : estimation?.wordCount ?? null,
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

    if (previousState.status === "fetch_failed_confirm") {
      if (estimatedMinutes === null) {
        return {
          status: "needs_estimate",
          message: MANUAL_ESTIMATE_REQUIRED_MESSAGE,
          draftValues,
          submittedAt: Date.now(),
        };
      }

      const item = await ingestUrl(
        {
          url,
          title: titleOverride,
          notes,
          priorityScore,
          estimatedMinutes,
          tagNames,
          lengthEstimationMethod: "manual",
          lengthEstimationConfidence: "unknown",
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

    if (previousState.status === "needs_estimate") {
      if (estimatedMinutes === null) {
        return {
          status: "needs_estimate",
          message: URL_ESTIMATE_REQUIRED_MESSAGE,
          draftValues,
          submittedAt: Date.now(),
        };
      }

      const item = await ingestUrl(
        {
          url,
          title: titleOverride,
          notes,
          priorityScore,
          estimatedMinutes,
          tagNames,
          lengthEstimationMethod: "manual",
          lengthEstimationConfidence: "unknown",
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
      return {
        status: "fetch_failed_confirm",
        message: FETCH_FAILED_CONFIRM_MESSAGE,
        draftValues,
        submittedAt: Date.now(),
      };
    }

    if (
      estimation.estimatedMinutes !== null &&
      estimation.estimatedMinutes !== undefined &&
      (estimation.confidence === "high" || estimation.confidence === "medium")
    ) {
      const item = await ingestUrl(
        {
          url,
          title: titleOverride,
          notes,
          priorityScore,
          estimatedMinutes: estimation.estimatedMinutes,
          tagNames,
          estimation,
          lengthEstimationMethod: estimation.method,
          lengthEstimationConfidence: estimation.confidence,
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

    return {
      status: "needs_estimate",
      message: URL_ESTIMATE_REQUIRED_MESSAGE,
      draftValues: {
        ...draftValues,
        estimatedMinutes:
          estimation?.estimatedMinutes !== null && estimation?.estimatedMinutes !== undefined
            ? String(estimation.estimatedMinutes)
            : draftValues.estimatedMinutes,
      },
      submittedAt: Date.now(),
    };
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
