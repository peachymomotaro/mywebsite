"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import type { IntakeFormState } from "@/lib/reading-river/intake-form-state";
import { buildTagWrite, createReadingItemForUser } from "@/lib/reading-river/extension-items";
import { readingRiverPath } from "@/lib/reading-river/routes";
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

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

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

export async function submitManualReadingItem(
  _previousState: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const title = String(formData.get("title") || "").trim();
  const estimatedMinutes = parseOptionalInteger(formData.get("estimatedMinutes"));

  if (estimatedMinutes === null || estimatedMinutes <= 0) {
    return {
      status: "error",
      message: "Add an estimated reading time so this item can be placed in your time buckets.",
      submittedAt: Date.now(),
    };
  }

  try {
    const item = await createReadingItem({
      title,
      sourceType: "manual",
      notes: String(formData.get("notes") || "") || null,
      estimatedMinutes,
      lengthEstimationMethod: "manual",
      lengthEstimationConfidence: "unknown",
      priorityScore: parseOptionalInteger(formData.get("priorityScore")) ?? 5,
      status: String(formData.get("status") || "unread"),
      tagNames: String(formData.get("tagNames") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    const savedTitle = item.title || title;

    return {
      status: "success",
      message: `Added "${savedTitle}" to the stream.`,
      savedTitle,
      submittedAt: Date.now(),
    };
  } catch {
    return {
      status: "error",
      message: "Couldn't add that item. Try again.",
      submittedAt: Date.now(),
    };
  }
}

export async function updateReadingItem(input: unknown) {
  const prisma = getPrismaClient();
  const currentUser = await requireCurrentUser();
  const parsed = readingItemUpdateSchema.parse(input);
  const { id, tagNames, ...data } = parsed;
  const ownedItem = await requireOwnedReadingItem(prisma, currentUser.id, id);

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
        ...data,
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
      priorityScore: Math.max(item.priorityScore - 1, 0),
    },
  });

  revalidatePath(STREAM_PATH);

  return updatedItem;
}
