import { z } from "zod";
import { READING_RIVER_LIMITS } from "@/lib/reading-river/input-limits";

const sourceTypeSchema = z.enum(["url", "pdf", "epub", "text", "manual", "book_chapter"]);
const readingStatusSchema = z.enum(["unread", "reading", "done", "not_now", "archived"]);
const lengthEstimationMethodSchema = z.enum([
  "schema_wordCount",
  "schema_timeRequired",
  "schema_articleBody",
  "readability",
  "trafilatura",
  "manual",
  "unknown",
]);
const lengthEstimationConfidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

const optionalString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable();

const optionalLimitedString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).optional().nullable();

const optionalPositiveInt = z.number().int().nonnegative().optional().nullable();

export const readingItemSchema = z.object({
  title: z.string().trim().min(1).max(READING_RIVER_LIMITS.titleLength),
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().url().max(READING_RIVER_LIMITS.urlLength).optional().nullable(),
  author: optionalLimitedString(READING_RIVER_LIMITS.authorLength),
  siteName: optionalString,
  notes: optionalLimitedString(READING_RIVER_LIMITS.notesLength),
  extractedText: optionalLimitedString(READING_RIVER_LIMITS.extractedTextLength),
  wordCount: optionalPositiveInt,
  estimatedMinutes: optionalPositiveInt,
  lengthEstimationMethod: lengthEstimationMethodSchema.optional().nullable(),
  lengthEstimationConfidence: lengthEstimationConfidenceSchema.optional().nullable(),
  priorityScore: z.number().int().min(0).max(10).nullable(),
  status: readingStatusSchema,
  pinned: z.boolean().optional().default(false),
  bookId: z.string().trim().min(1).optional().nullable(),
  chapterIndex: optionalPositiveInt,
  tagNames: z
    .array(z.string().trim().min(1).max(READING_RIVER_LIMITS.tagNameLength))
    .max(READING_RIVER_LIMITS.tagsPerItem)
    .optional()
    .default([]),
});

export const readingItemUpdateSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(READING_RIVER_LIMITS.titleLength).optional(),
  sourceType: sourceTypeSchema.optional(),
  sourceUrl: z.string().url().max(READING_RIVER_LIMITS.urlLength).optional().nullable(),
  author: optionalLimitedString(READING_RIVER_LIMITS.authorLength),
  siteName: optionalString,
  notes: optionalLimitedString(READING_RIVER_LIMITS.notesLength),
  extractedText: optionalLimitedString(READING_RIVER_LIMITS.extractedTextLength),
  wordCount: optionalPositiveInt,
  estimatedMinutes: optionalPositiveInt,
  lengthEstimationMethod: lengthEstimationMethodSchema.optional().nullable(),
  lengthEstimationConfidence: lengthEstimationConfidenceSchema.optional().nullable(),
  priorityScore: z.number().int().min(0).max(10).nullable().optional(),
  status: readingStatusSchema.optional(),
  pinned: z.boolean().optional(),
  bookId: z.string().trim().min(1).optional().nullable(),
  chapterIndex: optionalPositiveInt,
  tagNames: z
    .array(z.string().trim().min(1).max(READING_RIVER_LIMITS.tagNameLength))
    .max(READING_RIVER_LIMITS.tagsPerItem)
    .optional(),
});

export const readingItemIdSchema = z.string().trim().min(1);
export const readingItemPinnedSchema = z.object({
  id: readingItemIdSchema,
  pinned: z.boolean(),
});

export const readingItemStatusUpdateSchema = z.object({
  id: readingItemIdSchema,
  status: readingStatusSchema,
});

export const readingItemMarkAsReadSchema = z.object({
  id: readingItemIdSchema,
});

export const readingItemSkipSchema = z.object({
  id: readingItemIdSchema,
});

export const readingItemDeleteSchema = z.object({
  id: readingItemIdSchema,
});
