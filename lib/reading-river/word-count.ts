export function normalizeText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized ? normalized : null;
}

export function countWords(value: string | null) {
  if (!value) {
    return null;
  }

  const words = value.split(/\s+/).filter(Boolean);

  return words.length > 0 ? words.length : null;
}
