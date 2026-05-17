export const READING_RIVER_LIMITS = {
  titleLength: 300,
  notesLength: 5_000,
  tagNameLength: 64,
  tagsPerItem: 20,
  bookTitleLength: 300,
  authorLength: 200,
  urlLength: 2_048,
  extractedTextLength: 100_000,
  fetchedHtmlBytes: 1_500_000,
} as const;

export function truncateString(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function normalizeLimitedString(value: string, maxLength: number) {
  return truncateString(value.trim(), maxLength);
}

export function normalizeOptionalLimitedString(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalized = normalizeLimitedString(value ?? "", maxLength);

  return normalized ? normalized : null;
}

export function normalizeTagNames(tagNames: string[]) {
  const normalized = tagNames
    .map((tagName) => normalizeLimitedString(tagName, READING_RIVER_LIMITS.tagNameLength))
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, READING_RIVER_LIMITS.tagsPerItem);
}
