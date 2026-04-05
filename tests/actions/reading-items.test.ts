import { beforeEach, describe, expect, it, vi } from "vitest";
import { readingRiverPath } from "@/lib/reading-river/routes";
import {
  readingItemMarkAsReadSchema,
  readingItemSchema,
  readingItemSkipSchema,
  readingItemUpdateSchema,
} from "@/lib/reading-river/validators/reading-item";

const actionMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    requireCurrentUser: vi.fn(),
    revalidatePath: vi.fn(),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: actionMocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: actionMocks.requireCurrentUser,
}));

import { createReadingItem, updateReadingItem } from "@/app/reading-river/actions/reading-items";

describe("reading item validation", () => {
  beforeEach(() => {
    actionMocks.getPrismaClient.mockClear();
    actionMocks.requireCurrentUser.mockReset();
    actionMocks.revalidatePath.mockClear();
  });

  it("accepts a minimal manual item", () => {
    const parsed = readingItemSchema.parse({
      title: "Read later",
      sourceType: "manual",
      priorityScore: 5,
      status: "unread",
    });

    expect(parsed.title).toBe("Read later");
  });

  it("does not inject defaults for omitted fields when updating", () => {
    const parsed = readingItemUpdateSchema.parse({
      id: "item-123",
      title: "Updated title",
    });

    expect(parsed).toEqual({
      id: "item-123",
      title: "Updated title",
    });
  });

  it("accepts a mark-as-read action payload", () => {
    const parsed = readingItemMarkAsReadSchema.parse({
      id: "item-123",
    });

    expect(parsed).toEqual({
      id: "item-123",
    });
  });

  it("accepts a skip action payload", () => {
    const parsed = readingItemSkipSchema.parse({
      id: "item-456",
    });

    expect(parsed).toEqual({
      id: "item-456",
    });
  });

  it("creates a reading item for the current user", async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "item-1",
      ...data,
      tags: [
        {
          tag: {
            id: "tag-1",
            name: "keep",
          },
        },
      ],
    }));

    actionMocks.setPrismaMock({
      readingItem: {
        create,
      },
    });
    actionMocks.requireCurrentUser.mockResolvedValue({
      id: "user-1",
    });

    const item = await createReadingItem({
      title: "Read later",
      sourceType: "manual",
      notes: null,
      estimatedMinutes: 12,
      lengthEstimationMethod: "manual",
      lengthEstimationConfidence: "unknown",
      priorityScore: 5,
      status: "unread",
      tagNames: ["keep", " keep "],
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        title: "Read later",
        sourceType: "manual",
        notes: null,
        estimatedMinutes: 12,
        lengthEstimationMethod: "manual",
        lengthEstimationConfidence: "unknown",
        priorityScore: 5,
        status: "unread",
        pinned: false,
        tags: {
          create: [
            {
              tag: {
                connectOrCreate: {
                  where: {
                    userId_name: {
                      userId: "user-1",
                      name: "keep",
                    },
                  },
                  create: {
                    userId: "user-1",
                    name: "keep",
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith(readingRiverPath());
    expect(item).toMatchObject({
      id: "item-1",
      userId: "user-1",
      title: "Read later",
      tags: [
        {
          tag: {
            id: "tag-1",
            name: "keep",
          },
        },
      ],
    });
  });

  it("updates a reading item and rewrites tags", async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "item-1",
      ...data,
      tags: [
        {
          tag: {
            id: "tag-2",
            name: "next",
          },
        },
      ],
    }));
    const transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        readingItemTag: {
          deleteMany,
        },
        readingItem: {
          update,
        },
      }),
    );

    actionMocks.setPrismaMock({
      readingItem: {
        findUnique: vi.fn(async () => ({
          id: "item-1",
        })),
        update,
      },
      readingItemTag: {
        deleteMany,
      },
      $transaction: transaction,
    });
    actionMocks.requireCurrentUser.mockResolvedValue({
      id: "user-1",
    });

    const item = await updateReadingItem({
      id: "item-1",
      title: "Updated title",
      tagNames: ["next", " next "],
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        readingItemId: "item-1",
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: {
        userId_id: {
          userId: "user-1",
          id: "item-1",
        },
      },
      data: {
        userId: "user-1",
        title: "Updated title",
        tags: {
          create: [
            {
              tag: {
                connectOrCreate: {
                  where: {
                    userId_name: {
                      userId: "user-1",
                      name: "next",
                    },
                  },
                  create: {
                    userId: "user-1",
                    name: "next",
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    expect(item).toMatchObject({
      id: "item-1",
      title: "Updated title",
      tags: [
        {
          tag: {
            id: "tag-2",
            name: "next",
          },
        },
      ],
    });
  });
});
