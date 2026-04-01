import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const bookCreate = vi.fn();
  const requireCurrentUser = vi.fn();

  return {
    bookCreate,
    requireCurrentUser,
    prisma: {
      book: {
        create: bookCreate,
      },
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: () => mocks.prisma,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

describe("createBookWithChapters", () => {
  beforeEach(() => {
    mocks.bookCreate.mockReset();
    mocks.requireCurrentUser.mockReset();
  });

  it("assigns the created book and chapter items to the signed-in user", async () => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash: "hash",
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    });
    mocks.bookCreate.mockResolvedValue({
      id: "book-1",
      title: "My Book",
      items: [],
    });

    const { createBookWithChapters } = await import("@/app/reading-river/actions/books");

    await createBookWithChapters({
      title: "My Book",
      author: "A. Writer",
      notes: "Notes",
      chapters: [
        {
          title: "Chapter One",
          estimatedMinutes: 20,
        },
        {
          title: "   ",
          estimatedMinutes: 10,
        },
      ],
    });

    expect(mocks.bookCreate).toHaveBeenCalledWith({
      data: {
        title: "My Book",
        author: "A. Writer",
        notes: "Notes",
        userId: "user-1",
        items: {
          create: [
            {
              title: "Chapter One",
              sourceType: "book_chapter",
              estimatedMinutes: 20,
              priorityScore: 5,
              status: "unread",
              chapterIndex: 1,
              userId: "user-1",
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });
  });
});
