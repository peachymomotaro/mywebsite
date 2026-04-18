import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    requireCurrentUser: vi.fn(),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

describe("getKnownTagNames", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
    mocks.requireCurrentUser.mockReset();
    mocks.requireCurrentUser.mockResolvedValue({
      id: "user-1",
    });
    mocks.setPrismaMock({
      tag: {
        findMany: vi.fn(async () => [
          { name: "Policy" },
          { name: "Focus" },
          { name: "Longform" },
        ]),
      },
    });
  });

  it("returns the current user's tag names in alphabetical order", async () => {
    const { getKnownTagNames } = await import("@/lib/reading-river/known-tags");

    await expect(getKnownTagNames()).resolves.toEqual(["Focus", "Longform", "Policy"]);
  });
});
