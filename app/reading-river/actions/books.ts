"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import {
  normalizeLimitedString,
  normalizeOptionalLimitedString,
  READING_RIVER_LIMITS,
} from "@/lib/reading-river/input-limits";
import { readingRiverPath } from "@/lib/reading-river/routes";

const STREAM_PATH = readingRiverPath();

type BookInput = {
  title: string;
  author?: string | null;
  notes?: string | null;
};

export async function createBook(input: BookInput) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const title = normalizeLimitedString(input.title, READING_RIVER_LIMITS.bookTitleLength);

  if (!title || input.title.trim().length > READING_RIVER_LIMITS.bookTitleLength) {
    throw new Error("Book title is required.");
  }

  if ((input.author ?? "").trim().length > READING_RIVER_LIMITS.authorLength) {
    throw new Error("Book author is too long.");
  }

  if ((input.notes ?? "").trim().length > READING_RIVER_LIMITS.notesLength) {
    throw new Error("Book notes are too long.");
  }

  const result = await prisma.book.create({
    data: {
      userId: currentUser.id,
      title,
      author: normalizeOptionalLimitedString(input.author, READING_RIVER_LIMITS.authorLength),
      notes: normalizeOptionalLimitedString(input.notes, READING_RIVER_LIMITS.notesLength),
    },
  });

  revalidatePath(STREAM_PATH);

  return result;
}

export async function deleteBook(input: { id: string }) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const bookId = input.id.trim();

  if (!bookId) {
    throw new Error("Book id is required.");
  }

  const result = await prisma.book.deleteMany({
    where: {
      id: bookId,
      userId: currentUser.id,
    },
  });

  if (result.count === 0) {
    throw new Error(`Book ${bookId} was not found.`);
  }

  revalidatePath(STREAM_PATH);
}
