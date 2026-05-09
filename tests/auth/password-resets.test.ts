import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const passwordResetTokenCreate = vi.fn();
  const passwordResetTokenFindUnique = vi.fn();
  const passwordResetTokenUpdate = vi.fn();
  const userUpdate = vi.fn();
  const sessionUpdateMany = vi.fn();
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      passwordResetToken: {
        update: passwordResetTokenUpdate,
      },
      user: {
        update: userUpdate,
      },
      session: {
        updateMany: sessionUpdateMany,
      },
    }),
  );

  return {
    passwordResetTokenCreate,
    passwordResetTokenFindUnique,
    passwordResetTokenUpdate,
    userUpdate,
    sessionUpdateMany,
    transaction,
    prisma: {
      passwordResetToken: {
        create: passwordResetTokenCreate,
        findUnique: passwordResetTokenFindUnique,
      },
      $transaction: transaction,
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: () => mocks.prisma,
}));

describe("password resets", () => {
  beforeEach(() => {
    mocks.passwordResetTokenCreate.mockReset();
    mocks.passwordResetTokenFindUnique.mockReset();
    mocks.passwordResetTokenUpdate.mockReset();
    mocks.userUpdate.mockReset();
    mocks.sessionUpdateMany.mockReset();
    mocks.transaction.mockClear();
  });

  it("creates a reset token and stores only its hash", async () => {
    mocks.passwordResetTokenCreate.mockResolvedValue({ id: "reset-1" });

    const { createPasswordResetToken } = await import("@/lib/reading-river/password-resets");

    const result = await createPasswordResetToken({
      userId: "user-1",
      now: new Date("2026-05-09T12:00:00Z"),
    });

    const createArgs = mocks.passwordResetTokenCreate.mock.calls[0]?.[0];

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.userId).toBe("user-1");
    expect(createArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.tokenHash).not.toBe(result.token);
    expect(createArgs.data.expiresAt).toEqual(new Date("2026-05-09T13:00:00Z"));
  });

  it("resets the password once and revokes existing sessions", async () => {
    mocks.passwordResetTokenFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      expiresAt: new Date("2026-05-09T13:00:00Z"),
      usedAt: null,
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
      },
    });
    mocks.userUpdate.mockResolvedValue({
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
    });

    const { redeemPasswordResetToken } = await import("@/lib/reading-river/password-resets");

    const result = await redeemPasswordResetToken({
      token: "raw-token",
      password: "new-password",
      now: new Date("2026-05-09T12:10:00Z"),
    });

    expect(result).toEqual({
      status: "success",
      user: {
        id: "user-1",
        email: "reader@example.com",
        displayName: "River Reader",
      },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.stringMatching(/^scrypt\$/),
      },
    });
    expect(mocks.passwordResetTokenUpdate).toHaveBeenCalledWith({
      where: { id: "reset-1" },
      data: { usedAt: new Date("2026-05-09T12:10:00Z") },
    });
    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        revokedAt: null,
      },
      data: { revokedAt: new Date("2026-05-09T12:10:00Z") },
    });
  });
});
