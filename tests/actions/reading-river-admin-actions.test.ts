import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const authMocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(async () => ({
    id: "admin-1",
  })),
}));

const inviteMocks = vi.hoisted(() => ({
  createInvite: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendReadingRiverInviteEmail: vi.fn(),
}));

const dbMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireAdminUser: authMocks.requireAdminUser,
}));

vi.mock("@/lib/reading-river/invites", () => ({
  createInvite: inviteMocks.createInvite,
}));

vi.mock("@/lib/reading-river/email", () => ({
  sendReadingRiverInviteEmail: emailMocks.sendReadingRiverInviteEmail,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: dbMocks.getPrismaClient,
}));

describe("Reading River admin actions", () => {
  beforeEach(() => {
    actionMocks.revalidatePath.mockReset();
    actionMocks.redirect.mockClear();
    authMocks.requireAdminUser.mockClear();
    inviteMocks.createInvite.mockReset();
    emailMocks.sendReadingRiverInviteEmail.mockReset();
    dbMocks.getPrismaClient.mockClear();
  });

  it("redirects with sent status when the invite email succeeds", async () => {
    const { createInviteAction } = await import("@/app/reading-river/admin/actions");
    const formData = new FormData();

    formData.set("email", "reader@example.com");
    inviteMocks.createInvite.mockResolvedValue({
      token: "invite-token",
    });
    emailMocks.sendReadingRiverInviteEmail.mockResolvedValue({
      id: "email-1",
    });

    await expect(createInviteAction(formData)).rejects.toThrow(
      "redirect:/reading-river/admin?inviteToken=invite-token&emailStatus=sent",
    );

    expect(inviteMocks.createInvite).toHaveBeenCalledWith({
      email: "reader@example.com",
      createdByUserId: "admin-1",
    });
    expect(emailMocks.sendReadingRiverInviteEmail).toHaveBeenCalledWith({
      email: "reader@example.com",
      token: "invite-token",
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/reading-river/admin");
  });

  it("keeps the invite and redirects with failed status when email sending fails", async () => {
    const { createInviteAction } = await import("@/app/reading-river/admin/actions");
    const formData = new FormData();

    formData.set("email", "reader@example.com");
    inviteMocks.createInvite.mockResolvedValue({
      token: "invite-token",
    });
    emailMocks.sendReadingRiverInviteEmail.mockRejectedValue(new Error("Resend failed"));

    await expect(createInviteAction(formData)).rejects.toThrow(
      "redirect:/reading-river/admin?inviteToken=invite-token&emailStatus=failed",
    );

    expect(inviteMocks.createInvite).toHaveBeenCalledWith({
      email: "reader@example.com",
      createdByUserId: "admin-1",
    });
    expect(emailMocks.sendReadingRiverInviteEmail).toHaveBeenCalledWith({
      email: "reader@example.com",
      token: "invite-token",
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/reading-river/admin");
  });

  it("redirects back immediately when the email is blank", async () => {
    const { createInviteAction } = await import("@/app/reading-river/admin/actions");
    const formData = new FormData();

    formData.set("email", "   ");

    await expect(createInviteAction(formData)).rejects.toThrow("redirect:/reading-river/admin");

    expect(inviteMocks.createInvite).not.toHaveBeenCalled();
    expect(emailMocks.sendReadingRiverInviteEmail).not.toHaveBeenCalled();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revokes a pending invite", async () => {
    const inviteFindUnique = vi.fn(async () => ({
      id: "invite-1",
      redeemedAt: null,
      revokedAt: null,
    }));
    const inviteUpdate = vi.fn(async () => ({}));

    dbMocks.setPrismaMock({
      invite: {
        findUnique: inviteFindUnique,
        update: inviteUpdate,
      },
    });

    const { revokeInviteAction } = await import("@/app/reading-river/admin/actions");
    const formData = new FormData();
    formData.set("inviteId", "invite-1");

    await expect(revokeInviteAction(formData)).rejects.toThrow("redirect:/reading-river/admin");

    expect(inviteFindUnique).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
      },
    });
    expect(inviteUpdate).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/reading-river/admin");
  });

  it("does not revoke redeemed or already revoked invites", async () => {
    const inviteFindUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: "invite-redeemed",
        redeemedAt: new Date("2026-04-11T12:00:00Z"),
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        id: "invite-revoked",
        redeemedAt: null,
        revokedAt: new Date("2026-04-11T12:30:00Z"),
      });
    const inviteUpdate = vi.fn(async () => ({}));

    dbMocks.setPrismaMock({
      invite: {
        findUnique: inviteFindUnique,
        update: inviteUpdate,
      },
    });

    const { revokeInviteAction } = await import("@/app/reading-river/admin/actions");
    const redeemedFormData = new FormData();
    redeemedFormData.set("inviteId", "invite-redeemed");
    const revokedFormData = new FormData();
    revokedFormData.set("inviteId", "invite-revoked");

    await expect(revokeInviteAction(redeemedFormData)).rejects.toThrow(
      "redirect:/reading-river/admin",
    );
    await expect(revokeInviteAction(revokedFormData)).rejects.toThrow(
      "redirect:/reading-river/admin",
    );

    expect(inviteUpdate).not.toHaveBeenCalled();
    expect(actionMocks.revalidatePath).toHaveBeenCalledTimes(2);
  });
});
