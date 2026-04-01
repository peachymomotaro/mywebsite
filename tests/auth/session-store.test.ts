import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

import { createSession, getCurrentUserFromSessionToken, revokeSession } from "@/lib/reading-river/session";

function createPrismaMock() {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "session-1",
    tokenHash: data.tokenHash,
    userId: data.userId,
    expiresAt: data.expiresAt,
    revokedAt: null,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    lastUsedAt: data.lastUsedAt,
  }));

  const findUnique = vi.fn();
  const updateMany = vi.fn(async () => ({ count: 1 }));

  return {
    prismaMock: {
      session: {
        create,
        findUnique,
        updateMany,
      },
    },
    create,
    findUnique,
    updateMany,
  };
}

describe("session store", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
  });

  it("creates a session for a user with a hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    const result = await createSession("user-1", { now });
    const createArgs = context.create.mock.calls[0]?.[0];

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs?.data.userId).toBe("user-1");
    expect(createArgs?.data.tokenHash).not.toBe(result.token);
    expect(createArgs?.data.expiresAt).toEqual(new Date("2026-05-01T12:00:00Z"));
  });

  it("rejects an expired session when loading the current user", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "session-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-04-01T11:59:59Z"),
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: null,
        passwordHash: "password-hash",
        status: "active",
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    await expect(getCurrentUserFromSessionToken("raw-token", now)).resolves.toBeNull();
  });

  it("rejects a revoked session when loading the current user", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "session-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-05-01T12:00:00Z"),
      revokedAt: new Date("2026-04-01T12:00:00Z"),
      createdAt: now,
      lastUsedAt: now,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: null,
        passwordHash: "password-hash",
        status: "active",
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    await expect(getCurrentUserFromSessionToken("raw-token", now)).resolves.toBeNull();
  });

  it("treats a missing Session table as an anonymous request", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");
    const missingTableError = Object.assign(new Error("The table `public.Session` does not exist."), {
      code: "P2021",
      meta: {
        modelName: "Session",
      },
    });

    context.findUnique.mockRejectedValue(missingTableError);

    await expect(getCurrentUserFromSessionToken("raw-token", now)).resolves.toBeNull();
  });

  it("revokes a session by hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    await revokeSession("raw-token", now);

    expect(context.updateMany).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        tokenHash: expect.any(String),
      },
      data: {
        revokedAt: now,
      },
    });
  });
});
