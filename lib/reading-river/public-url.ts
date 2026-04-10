import { readingRiverPath } from "@/lib/reading-river/routes";

function getReadingRiverBaseUrl() {
  const baseUrl = process.env.READING_RIVER_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("READING_RIVER_BASE_URL must be set before sending invite emails.");
  }

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function getReadingRiverInviteUrl(token: string) {
  return new URL(
    readingRiverPath(`/invite/${encodeURIComponent(token)}`),
    getReadingRiverBaseUrl(),
  ).toString();
}
