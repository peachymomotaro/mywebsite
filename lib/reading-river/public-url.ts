import { readingRiverItemEditPath, readingRiverPath } from "@/lib/reading-river/routes";

function getReadingRiverBaseUrl() {
  const baseUrl = process.env.READING_RIVER_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("READING_RIVER_BASE_URL must be set before building Reading River URLs.");
  }

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function getReadingRiverUrl(path = "") {
  return new URL(path || readingRiverPath(), getReadingRiverBaseUrl()).toString();
}

export function getReadingRiverInviteUrl(token: string) {
  return getReadingRiverUrl(readingRiverPath(`/invite/${encodeURIComponent(token)}`));
}

export function getReadingRiverPasswordResetUrl(token: string) {
  return getReadingRiverUrl(readingRiverPath(`/reset-password/${encodeURIComponent(token)}`));
}

export function getReadingRiverHomeUrl() {
  return getReadingRiverUrl();
}

export function getReadingRiverItemUrl(id: string) {
  return getReadingRiverUrl(readingRiverItemEditPath(id));
}
