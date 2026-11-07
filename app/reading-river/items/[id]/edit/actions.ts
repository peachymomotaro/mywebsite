"use server";

import { redirect } from "next/navigation";
import { updateReadingItem } from "@/app/reading-river/actions/reading-items";
import { READING_RIVER_LIMITS } from "@/lib/reading-river/input-limits";
import { readingRiverItemEditPath, readingRiverPath } from "@/lib/reading-river/routes";
import { isDuplicateReadingItemUrlError } from "@/lib/reading-river/source-url";

function parseInteger(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());

  return Number.isInteger(parsed) ? parsed : null;
}

function parseTagNames(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeSubmittedUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > READING_RIVER_LIMITS.urlLength) {
    return null;
  }

  try {
    const normalized = new URL(trimmed);

    if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
      return null;
    }

    return normalized.toString();
  } catch {
    return null;
  }
}

function redirectToEdit(id: string, error: string): never {
  if (!id) {
    return redirect(readingRiverPath());
  }

  return redirect(`${readingRiverItemEditPath(id)}?error=${encodeURIComponent(error)}`);
}

export async function saveReadingItemEditAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const sourceType = String(formData.get("sourceType") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const estimatedMinutes = parseInteger(formData.get("estimatedMinutes"));

  if (
    !id ||
    !title ||
    title.length > READING_RIVER_LIMITS.titleLength ||
    estimatedMinutes === null ||
    estimatedMinutes <= 0
  ) {
    redirectToEdit(id, "invalid_input");
  }

  const validatedEstimatedMinutes = estimatedMinutes;

  const updateInput: {
    id: string;
    title: string;
    estimatedMinutes: number;
    priorityScore: number | null;
    tagNames: string[];
    sourceUrl?: string;
  } = {
    id,
    title,
    estimatedMinutes: validatedEstimatedMinutes,
    // Priority is gone; saving clears any left over.
    priorityScore: null,
    tagNames: parseTagNames(String(formData.get("tagNames") ?? "")),
  };

  if (sourceType === "url") {
    const sourceUrl = normalizeSubmittedUrl(String(formData.get("sourceUrl") ?? ""));

    if (!sourceUrl) {
      redirectToEdit(id, "invalid_input");
    }

    updateInput.sourceUrl = sourceUrl;
  }

  try {
    await updateReadingItem(updateInput);
  } catch (error) {
    if (isDuplicateReadingItemUrlError(error)) {
      redirectToEdit(id, "duplicate_url");
    }

    redirectToEdit(id, "save_failed");
  }

  redirect(readingRiverPath());
}
