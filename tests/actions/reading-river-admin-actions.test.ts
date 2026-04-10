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

describe("Reading River admin actions", () => {
  beforeEach(() => {
    actionMocks.revalidatePath.mockReset();
    actionMocks.redirect.mockClear();
    authMocks.requireAdminUser.mockClear();
    inviteMocks.createInvite.mockReset();
    emailMocks.sendReadingRiverInviteEmail.mockReset();
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
});
