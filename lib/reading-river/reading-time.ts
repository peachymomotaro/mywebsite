import { DEFAULT_READING_SPEED_WPM } from "@/lib/reading-river/reading-config";

export function estimateReadingTime(
  wordCount: number,
  wordsPerMinute = DEFAULT_READING_SPEED_WPM,
) {
  if (wordCount <= 0 || wordsPerMinute <= 0) {
    return 0;
  }

  return Math.ceil(wordCount / wordsPerMinute);
}
