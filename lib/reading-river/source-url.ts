import { getPrismaClient } from "@/lib/reading-river/db";

type ReadingRiverPrismaClient = ReturnType<typeof getPrismaClient>;

export class DuplicateReadingItemUrlError extends Error {
  duplicateItemId?: string;
  sourceUrl: string;

  constructor(sourceUrl: string, duplicateItemId?: string) {
    super("duplicate_reading_item_url");
    this.name = "DuplicateReadingItemUrlError";
    this.sourceUrl = sourceUrl;
    this.duplicateItemId = duplicateItemId;
  }
}

export function isDuplicateReadingItemUrlError(
  error: unknown,
): error is DuplicateReadingItemUrlError {
  return error instanceof DuplicateReadingItemUrlError;
}

export function normalizeStoredSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const normalized = new URL(trimmed);

    if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
      return null;
    }

    return normalized.toString();
  } catch {
    return null;
  }
}

export async function findDuplicateReadingItemBySourceUrl(
  prisma: ReadingRiverPrismaClient,
  userId: string,
  sourceUrl: string | null | undefined,
  options: {
    excludeId?: string;
  } = {},
) {
  const normalizedSourceUrl = normalizeStoredSourceUrl(sourceUrl);

  if (!normalizedSourceUrl) {
    return null;
  }

  return prisma.readingItem.findFirst({
    where: {
      userId,
      sourceUrl: normalizedSourceUrl,
      ...(options.excludeId
        ? {
            NOT: {
              id: options.excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
    },
  });
}

export async function assertNoDuplicateReadingItemSourceUrl(
  prisma: ReadingRiverPrismaClient,
  userId: string,
  sourceUrl: string | null | undefined,
  options: {
    excludeId?: string;
  } = {},
) {
  const normalizedSourceUrl = normalizeStoredSourceUrl(sourceUrl);

  if (!normalizedSourceUrl) {
    return null;
  }

  const duplicateItem = await findDuplicateReadingItemBySourceUrl(prisma, userId, normalizedSourceUrl, options);

  if (duplicateItem) {
    throw new DuplicateReadingItemUrlError(normalizedSourceUrl, duplicateItem.id);
  }

  return normalizedSourceUrl;
}
