"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { buildTagWrite, createReadingItemForUser } from "@/lib/reading-river/extension-items";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { assertNoDuplicateReadingItemSourceUrl } from "@/lib/reading-river/source-url";
import {
  readingItemIdSchema,
  readingItemMarkAsReadSchema,
  readingItemPinnedSchema,
  readingItemSchema,
  readingItemSkipSchema,
  readingItemStatusUpdateSchema,
  readingItemUpdateSchema,
} from "@/lib/reading-river/validators/reading-item";

const STREAM_PATH = readingRiverPath();
const HISTORY_PATH = readingRiverPath("/history");

async function requireOwnedReadingItem(prisma: ReturnType<typeof getPrismaClient>, userId: string, id: string) {
  const item = await prisma.readingItem.findUnique({
    where: {
      userId_id: {
        userId,
        id,
      },
    },
  });

  if (!item) {
    throw new Error(`Reading item ${id} was not found.`);
  }

  return item;
}

export async function createReadingItem(input: unknown) {
  const currentUser = await requireCurrentUser();
  const parsed = readingItemSchema.parse(input);
  const { tagNames, ...data } = parsed;

  return createReadingItemForUser(currentUser.id, {
    ...data,
    tagNames,
  });
}

export async function updateReadingItem(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemUpdateSchema.parse(input);
  const { id, tagNames, ...data } = parsed;
  const { sourceUrl, ...restData } = data;
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, id);
  const normalizedSourceUrl =
    sourceUrl === undefined
      ? undefined
      : await assertNoDuplicateReadingItemSourceUrl(prisma, currentUser.id, sourceUrl, {
          excludeId: ownedItem.id,
        });

  const item = await prisma.$transaction(async (tx) => {
    if (tagNames) {
      await tx.readingItemTag.deleteMany({
        where: { readingItemId: ownedItem.id },
      });
    }

    return tx.readingItem.update({
      where: {
        userId_id: {
          userId: currentUser.id,
          id: ownedItem.id,
        },
      },
      data: {
        userId: currentUser.id,
        ...restData,
        ...(sourceUrl !== undefined ? { sourceUrl: normalizedSourceUrl } : {}),
        ...(tagNames
          ? {
              tags: buildTagWrite(currentUser.id, tagNames),
            }
          : {}),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  });

  revalidatePath(STREAM_PATH);

  return item;
}

export async function deleteReadingItem(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const id = readingItemIdSchema.parse(input);
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, id);

  const item = await prisma.readingItem.delete({
    where: {
      userId_id: {
        userId: currentUser.id,
        id: ownedItem.id,
      },
    },
  });

  revalidatePath(STREAM_PATH);

  return item;
}

export async function setPinned(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemPinnedSchema.parse(input);
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, parsed.id);

  const item = await prisma.readingItem.update({
    where: {
      userId_id: {
        userId: currentUser.id,
        id: ownedItem.id,
      },
    },
    data: { pinned: parsed.pinned },
  });

  revalidatePath(STREAM_PATH);

  return item;
}

export async function setReadingStatus(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemStatusUpdateSchema.parse(input);
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, parsed.id);

  const item = await prisma.readingItem.update({
    where: {
      userId_id: {
        userId: currentUser.id,
        id: ownedItem.id,
      },
    },
    data: { status: parsed.status },
  });

  revalidatePath(STREAM_PATH);

  return item;
}

export async function markAsRead(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemMarkAsReadSchema.parse(input);
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, parsed.id);

  const item = await prisma.$transaction(async (tx) => {
    await tx.readEvent.upsert({
      where: {
        userId_readingItemId: {
          userId: currentUser.id,
          readingItemId: ownedItem.id,
        },
      },
      update: {},
      create: {
        userId: currentUser.id,
        readingItemId: ownedItem.id,
      },
    });

    return tx.readingItem.update({
      where: {
        userId_id: {
          userId: currentUser.id,
          id: ownedItem.id,
        },
      },
      data: { status: "done" },
    });
  });

  revalidatePath(STREAM_PATH);
  revalidatePath(HISTORY_PATH);

  return item;
}

export async function skipReadingItem(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemSkipSchema.parse(input);
  const item = await prisma.readingItem.findUnique({
    where: {
      userId_id: {
        userId: currentUser.id,
        id: parsed.id,
      },
    },
  });

  if (!item) {
    throw new Error(`Reading item ${parsed.id} was not found.`);
  }

  const updatedItem = await prisma.readingItem.update({
    where: {
      userId_id: {
        userId: currentUser.id,
        id: parsed.id,
      },
    },
    data: {
      priorityScore:
        item.priorityScore === null ? null : Math.max(item.priorityScore - 1, 0),
    },
  });

  revalidatePath(STREAM_PATH);

  return updatedItem;
}
