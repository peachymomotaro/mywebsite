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

import {
  createExtensionToken,
  getCurrentUserFromExtensionToken,
  getExtensionTokenByRawToken,
  revokeExtensionToken,
} from "@/lib/reading-river/extension-auth";
import * as extensionAuth from "@/lib/reading-river/extension-auth";

function createPrismaMock() {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "extension-token-1",
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
      extensionToken: {
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

describe("extension auth token store", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
  });

  it("creates an extension token for a user with a hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    const result = await createExtensionToken("user-1", { now });
    const createArgs = context.create.mock.calls[0]?.[0];

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs?.data.userId).toBe("user-1");
    expect(createArgs?.data.tokenHash).not.toBe(result.token);
    expect(createArgs?.data.expiresAt).toEqual(new Date("2026-05-01T12:00:00Z"));
    expect(createArgs?.data.lastUsedAt).toEqual(now);
  });

  it("looks up extension tokens by hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);

    await getExtensionTokenByRawToken("raw-token", new Date("2026-04-01T12:00:00Z"));

    const findUniqueArgs = context.findUnique.mock.calls[0]?.[0];

    expect(findUniqueArgs?.where?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(findUniqueArgs?.where?.tokenHash).not.toBe("raw-token");
  });

  it("includes the user when loading the current extension user", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "extension-token-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-05-01T12:00:00Z"),
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
        passwordHash: "password-hash",
        status: "active",
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    await getCurrentUserFromExtensionToken("raw-token", now);

    expect(context.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String),
      },
      include: {
        user: true,
      },
    });
  });

  it("returns the active user for a valid extension token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "extension-token-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-05-01T12:00:00Z"),
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
        passwordHash: "password-hash",
        status: "active",
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    await expect(getCurrentUserFromExtensionToken("raw-token", now)).resolves.toMatchObject({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
    });
  });

  it("rejects deactivated extension users when loading the current user", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "extension-token-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-05-01T12:00:00Z"),
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
        passwordHash: "password-hash",
        status: "deactivated",
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    await expect(getCurrentUserFromExtensionToken("raw-token", now)).resolves.toBeNull();
  });

  it("rejects expired tokens when loading by raw token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "extension-token-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-04-01T11:59:59Z"),
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    });

    await expect(getExtensionTokenByRawToken("raw-token", now)).resolves.toBeNull();
  });

  it("rejects revoked tokens when loading by raw token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    context.findUnique.mockResolvedValue({
      id: "extension-token-1",
      tokenHash: "hashed-token",
      userId: "user-1",
      expiresAt: new Date("2026-05-01T12:00:00Z"),
      revokedAt: new Date("2026-04-01T12:00:00Z"),
      createdAt: now,
      lastUsedAt: now,
    });

    await expect(getExtensionTokenByRawToken("raw-token", now)).resolves.toBeNull();
  });

  it("treats a missing ExtensionToken table as an anonymous request", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");
    const missingTableError = Object.assign(new Error("The table `public.ExtensionToken` does not exist."), {
      code: "P2021",
      meta: {
        modelName: "ExtensionToken",
      },
    });

    context.findUnique.mockRejectedValue(missingTableError);

    await expect(getExtensionTokenByRawToken("raw-token", now)).resolves.toBeNull();
    await expect(getCurrentUserFromExtensionToken("raw-token", now)).resolves.toBeNull();
  });

  it("does not export the legacy extension token alias", () => {
    expect(extensionAuth.getExtensionTokenByToken).toBeUndefined();
  });

  it("revokes an extension token by hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prismaMock);
    const now = new Date("2026-04-01T12:00:00Z");

    await revokeExtensionToken("raw-token", now);

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
