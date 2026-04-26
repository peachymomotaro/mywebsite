"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { readingRiverPath } from "@/lib/reading-river/routes";

const STREAM_PATH = readingRiverPath();

type BookInput = {
  title: string;
  author?: string | null;
  notes?: string | null;
};

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export async function createBook(input: BookInput) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();

  const result = await prisma.book.create({
    data: {
      userId: currentUser.id,
      title: input.title.trim(),
      author: normalizeOptionalString(input.author),
      notes: normalizeOptionalString(input.notes),
    },
  });

  revalidatePath(STREAM_PATH);

  return result;
}
