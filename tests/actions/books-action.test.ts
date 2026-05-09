import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const bookCreate = vi.fn();
  const bookDeleteMany = vi.fn();
  const requireCurrentUser = vi.fn();
  const revalidatePath = vi.fn();

  return {
    bookCreate,
    bookDeleteMany,
    requireCurrentUser,
    revalidatePath,
    prisma: {
      book: {
        create: bookCreate,
        deleteMany: bookDeleteMany,
      },
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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
    mocks.bookDeleteMany.mockReset();
    mocks.requireCurrentUser.mockReset();
    mocks.revalidatePath.mockReset();
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

  it("permanently deletes only a book owned by the signed-in user", async () => {
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
    mocks.bookDeleteMany.mockResolvedValue({ count: 1 });

    const { deleteBook } = await import("@/app/reading-river/actions/books");

    await deleteBook({ id: "book-1" });

    expect(mocks.bookDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "book-1",
        userId: "user-1",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reading-river");
  });
});
