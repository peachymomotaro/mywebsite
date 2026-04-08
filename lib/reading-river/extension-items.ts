import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readingRiverPath } from "@/lib/reading-river/routes";

const STREAM_PATH = readingRiverPath();

function normalizeTagNames(tagNames: string[]) {
  return [...new Set(tagNames.map((tagName) => tagName.trim()).filter(Boolean))];
}

export function buildTagWrite(userId: string, tagNames: string[]) {
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

type CreateReadingItemForUserInput = {
  title: string;
  sourceType: "url" | "pdf" | "epub" | "text" | "manual" | "book_chapter";
  sourceUrl?: string | null;
  author?: string | null;
  siteName?: string | null;
  notes?: string | null;
  extractedText?: string | null;
  wordCount?: number | null;
  estimatedMinutes?: number | null;
  lengthEstimationMethod?:
    | "schema_wordCount"
    | "schema_timeRequired"
    | "schema_articleBody"
    | "readability"
    | "trafilatura"
    | "manual"
    | "unknown"
    | null;
  lengthEstimationConfidence?: "high" | "medium" | "low" | "unknown" | null;
  priorityScore: number;
  status: "unread" | "reading" | "done" | "not_now" | "archived";
  pinned?: boolean;
  bookId?: string | null;
  chapterIndex?: number | null;
  tagNames?: string[];
};

export async function createReadingItemForUser(
  userId: string,
  input: CreateReadingItemForUserInput,
) {
  const prisma = getPrismaClient();
  const { tagNames, ...data } = input;
  const normalizedTagNames = normalizeTagNames(tagNames ?? []);

  const item = await prisma.readingItem.create({
    data: {
      userId,
      ...data,
      ...(normalizedTagNames.length > 0 ? { tags: buildTagWrite(userId, normalizedTagNames) } : {}),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  revalidatePath(STREAM_PATH);

  return item;
}
