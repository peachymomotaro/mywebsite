"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { readingRiverPath } from "@/lib/reading-river/routes";

const STREAM_PATH = readingRiverPath();

type ChapterInput = {
  title: string;
  estimatedMinutes?: number | null;
};

type CreateBookInput = {
  title: string;
  author?: string | null;
  notes?: string | null;
  chapters: ChapterInput[];
};

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export async function createBookWithChapters(input: CreateBookInput) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const chapters = input.chapters
    .map((chapter, index) => ({
      title: chapter.title.trim(),
      estimatedMinutes: chapter.estimatedMinutes ?? null,
      chapterIndex: index + 1,
    }))
    .filter((chapter) => chapter.title.length > 0);

  const result = await prisma.book.create({
    data: {
      userId: currentUser.id,
      title: input.title.trim(),
      author: normalizeOptionalString(input.author),
      notes: normalizeOptionalString(input.notes),
      items: {
        create: chapters.map((chapter) => ({
          userId: currentUser.id,
          title: chapter.title,
          sourceType: "book_chapter",
          estimatedMinutes: chapter.estimatedMinutes,
          priorityScore: 5,
          status: "unread",
          chapterIndex: chapter.chapterIndex,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  revalidatePath(STREAM_PATH);

  return result;
}
