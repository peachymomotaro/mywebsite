import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => {
  const redirect = vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  const cookies = vi.fn(async () => ({
    set: vi.fn(),
  }));

  return {
    redirect,
    cookies,
  };
});

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

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));

vi.mock("next/headers", () => ({
  cookies: actionMocks.cookies,
}));

const sessionMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
}));

vi.mock("@/lib/reading-river/session", () => ({
  createSession: sessionMocks.createSession,
}));

import { createInvite, redeemInvite } from "@/lib/reading-river/invites";

function createPrismaMock() {
  let inviteRecord = {
    id: "invite-1",
    email: "reader@example.com",
    tokenHash: "stored-hash",
    expiresAt: new Date("2026-04-08T12:00:00Z"),
    redeemedAt: null as Date | null,
    revokedAt: null as Date | null,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
    createdByUserId: "admin-1",
    redeemedByUserId: null as string | null,
  };
  let createdUser:
    | {
        id: string;
        email: string;
        displayName: string | null;
        passwordHash: string;
        status: "active";
        isAdmin: false;
        createdAt: Date;
        updatedAt: Date;
      }
    | null = null;

  const inviteCreate = vi.fn(async ({ data }: { data: typeof inviteRecord }) => ({
    ...inviteRecord,
    ...data,
  }));
  const inviteFindUnique = vi.fn(async () => inviteRecord);
  const inviteUpdate = vi.fn(async ({ data }: { data: Partial<typeof inviteRecord> }) => {
    inviteRecord = {
      ...inviteRecord,
      ...data,
    };

    return inviteRecord;
  });
  const userFindUnique = vi.fn(async () => createdUser);
  const userCreate = vi.fn(
    async ({
      data,
    }: {
      data: {
        email: string;
        displayName: string | null;
        passwordHash: string;
      };
    }) => {
      createdUser = {
        id: "user-1",
        email: data.email,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        status: "active",
        isAdmin: false,
        createdAt: new Date("2026-04-01T12:00:00Z"),
        updatedAt: new Date("2026-04-01T12:00:00Z"),
      };

      return createdUser;
    },
  );
  const transactionClient = {
    invite: {
      create: inviteCreate,
      findUnique: inviteFindUnique,
      update: inviteUpdate,
    },
    user: {
      findUnique: userFindUnique,
      create: userCreate,
    },
  };
  const transaction = vi.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
    callback(transactionClient),
  );

  return {
    prisma: {
      $transaction: transaction,
      invite: {
        create: inviteCreate,
        findUnique: inviteFindUnique,
        update: inviteUpdate,
      },
      user: {
        findUnique: userFindUnique,
        create: userCreate,
      },
    },
    inviteCreate,
    inviteFindUnique,
    inviteUpdate,
    userFindUnique,
    userCreate,
    transaction,
    setInviteRecord(nextInvite: typeof inviteRecord) {
      inviteRecord = nextInvite;
    },
  };
}

describe("invites", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
  });

  it("generates an invite token and stores only the hashed value", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prisma);
    const expiresAt = new Date("2026-04-08T12:00:00Z");

    const result = await createInvite({
      email: "Reader@Example.com",
      createdByUserId: "admin-1",
      expiresAt,
    });

    const createArgs = context.inviteCreate.mock.calls[0]?.[0];

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.email).toBe("reader@example.com");
    expect(createArgs.data.createdByUserId).toBe("admin-1");
    expect(createArgs.data.expiresAt).toEqual(expiresAt);
    expect(createArgs.data.tokenHash).not.toBe(result.token);
  });

  it("looks up invites by hashed token", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prisma);

    await redeemInvite({
      token: "raw-token",
      password: "reader-password",
      now: new Date("2026-04-01T12:00:00Z"),
    });

    const findUniqueArgs = context.inviteFindUnique.mock.calls[0]?.[0];

    expect(findUniqueArgs?.where?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(findUniqueArgs?.where?.tokenHash).not.toBe("raw-token");
  });

  it("accepts prefixed invite URLs and paths", async () => {
    const { goToInviteRedemptionAction } = await import("@/app/reading-river/invite/actions");
    const pathFormData = new FormData();
    pathFormData.set("invite", "/reading-river/invite/invite-token");

    await expect(
      goToInviteRedemptionAction(pathFormData),
    ).rejects.toThrow("redirect:/reading-river/invite/invite-token");

    const urlFormData = new FormData();
    urlFormData.set("invite", "https://reading-river.test/reading-river/invite/invite-token");

    await expect(
      goToInviteRedemptionAction(urlFormData),
    ).rejects.toThrow("redirect:/reading-river/invite/invite-token");
  });

  it("rejects empty passwords without calling the invite flow", async () => {
    const { redeemInviteAction } = await import("@/app/reading-river/invite/[token]/actions");
    const formData = new FormData();

    formData.set("token", "invite-token");
    formData.set("password", "   ");

    await expect(redeemInviteAction(formData)).rejects.toThrow(
      "redirect:/reading-river/invite/invite-token?error=invalid_input",
    );
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("redeems an invite exactly once", async () => {
    const context = createPrismaMock();
    mocks.setPrismaMock(context.prisma);
    const now = new Date("2026-04-01T12:00:00Z");

    await expect(
      redeemInvite({
        token: "raw-token",
        password: "reader-password",
        displayName: "River Reader",
        now,
      }),
    ).resolves.toMatchObject({
      status: "success",
      user: {
        email: "reader@example.com",
        displayName: "River Reader",
      },
    });
    expect(context.transaction).toHaveBeenCalledTimes(1);

    await expect(
      redeemInvite({
        token: "raw-token",
        password: "reader-password",
        displayName: "River Reader",
        now,
      }),
    ).resolves.toMatchObject({
      status: "redeemed",
    });
  });

  it("rejects expired invites", async () => {
    const context = createPrismaMock();
    context.setInviteRecord({
      id: "invite-expired",
      email: "reader@example.com",
      tokenHash: "stored-hash",
      expiresAt: new Date("2026-04-01T11:59:59Z"),
      redeemedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-04-01T11:00:00Z"),
      updatedAt: new Date("2026-04-01T11:00:00Z"),
      createdByUserId: "admin-1",
      redeemedByUserId: null,
    });
    mocks.setPrismaMock(context.prisma);

    await expect(
      redeemInvite({
        token: "raw-token",
        password: "reader-password",
        now: new Date("2026-04-01T12:00:00Z"),
      }),
    ).resolves.toMatchObject({
      status: "expired",
    });
  });

  it("rejects revoked invites", async () => {
    const context = createPrismaMock();
    context.setInviteRecord({
      id: "invite-revoked",
      email: "reader@example.com",
      tokenHash: "stored-hash",
      expiresAt: new Date("2026-04-08T12:00:00Z"),
      redeemedAt: null,
      revokedAt: new Date("2026-04-01T12:00:00Z"),
      createdAt: new Date("2026-04-01T11:00:00Z"),
      updatedAt: new Date("2026-04-01T11:00:00Z"),
      createdByUserId: "admin-1",
      redeemedByUserId: null,
    });
    mocks.setPrismaMock(context.prisma);

    await expect(
      redeemInvite({
        token: "raw-token",
        password: "reader-password",
        now: new Date("2026-04-01T12:00:00Z"),
      }),
    ).resolves.toMatchObject({
      status: "revoked",
    });
  });
});
