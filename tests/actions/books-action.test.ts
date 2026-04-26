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

describe("createBook", () => {
  beforeEach(() => {
    mocks.bookCreate.mockReset();
    mocks.requireCurrentUser.mockReset();
  });

  it("assigns the created book to the signed-in user without creating reading items", async () => {
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

    const { createBook } = await import("@/app/reading-river/actions/books");

    await createBook({
      title: "My Book",
      author: "A. Writer",
      notes: "Notes",
    });

    expect(mocks.bookCreate).toHaveBeenCalledWith({
      data: {
        title: "My Book",
        author: "A. Writer",
        notes: "Notes",
        userId: "user-1",
      },
    });
  });
});
