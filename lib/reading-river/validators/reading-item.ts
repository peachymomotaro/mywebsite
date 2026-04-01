import { z } from "zod";

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

const optionalPositiveInt = z.number().int().nonnegative().optional().nullable();

export const readingItemSchema = z.object({
  title: z.string().trim().min(1),
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().url().optional().nullable(),
  author: optionalString,
  siteName: optionalString,
  notes: optionalString,
  extractedText: optionalString,
  wordCount: optionalPositiveInt,
  estimatedMinutes: optionalPositiveInt,
  lengthEstimationMethod: lengthEstimationMethodSchema.optional().nullable(),
  lengthEstimationConfidence: lengthEstimationConfidenceSchema.optional().nullable(),
  priorityScore: z.number().int().min(0).max(10),
  status: readingStatusSchema,
  pinned: z.boolean().optional().default(false),
  bookId: z.string().trim().min(1).optional().nullable(),
  chapterIndex: optionalPositiveInt,
  tagNames: z.array(z.string().trim().min(1)).optional().default([]),
});

export const readingItemUpdateSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  sourceType: sourceTypeSchema.optional(),
  sourceUrl: z.string().url().optional().nullable(),
  author: optionalString,
  siteName: optionalString,
  notes: optionalString,
  extractedText: optionalString,
  wordCount: optionalPositiveInt,
  estimatedMinutes: optionalPositiveInt,
  lengthEstimationMethod: lengthEstimationMethodSchema.optional().nullable(),
  lengthEstimationConfidence: lengthEstimationConfidenceSchema.optional().nullable(),
  priorityScore: z.number().int().min(0).max(10).optional(),
  status: readingStatusSchema.optional(),
  pinned: z.boolean().optional(),
  bookId: z.string().trim().min(1).optional().nullable(),
  chapterIndex: optionalPositiveInt,
  tagNames: z.array(z.string().trim().min(1)).optional(),
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
