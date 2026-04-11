import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headersMock: vi.fn(),
  requireAdminUserMock: vi.fn(async () => ({
    id: "admin-1",
    email: "admin@example.com",
    displayName: "Admin Reader",
    passwordHash: "hash",
    status: "active",
    isAdmin: true,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
  })),
  getPrismaClientMock: vi.fn(),
  invites: [] as Array<{
    id: string;
    email: string;
    expiresAt: Date;
    redeemedAt: Date | null;
    revokedAt: Date | null;
    updatedAt: Date;
  }>,
  users: [] as Array<{
    id: string;
    email: string;
    displayName: string | null;
    passwordHash: string;
    status: "active" | "deactivated";
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headersMock,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireAdminUser: mocks.requireAdminUserMock,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClientMock,
}));

describe("Reading River admin page", () => {
  beforeEach(() => {
    mocks.headersMock.mockReset();
    mocks.invites = [];
    mocks.users = [];
    mocks.headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "x-forwarded-proto") {
          return "https";
        }

        if (name === "x-forwarded-host" || name === "host") {
          return "petercurry.org";
        }

        return null;
      }),
    });
    mocks.getPrismaClientMock.mockReturnValue({
      invite: {
        findMany: vi.fn(async () => mocks.invites),
      },
      user: {
        findMany: vi.fn(async () => mocks.users),
      },
    });
  });

  it("shows success feedback when the invite email sends", async () => {
    const { default: AdminPage } = await import("@/app/reading-river/admin/page");
    const page = await AdminPage({
      searchParams: {
        inviteToken: "invite-token",
        emailStatus: "sent",
      },
    });

    const { container } = render(page);

    expect(container.querySelector(".editorial-page-kicker")).not.toBeInTheDocument();
    expect(screen.getByText("Invite email sent.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://petercurry.org/reading-river/invite/invite-token")).toBeInTheDocument();
  });

  it("shows fallback copy when the invite exists but email sending fails", async () => {
    const { default: AdminPage } = await import("@/app/reading-river/admin/page");
    const page = await AdminPage({
      searchParams: {
        inviteToken: "invite-token",
        emailStatus: "failed",
      },
    });

    render(page);

    expect(screen.getByText("Invite created, but the email did not send. Copy the link below and send it manually.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://petercurry.org/reading-river/invite/invite-token")).toBeInTheDocument();
  });

  it("shows a revoke button for pending invites and hides revoked ones", async () => {
    mocks.invites = [
      {
        id: "invite-pending",
        email: "pending@example.com",
        expiresAt: new Date("2026-04-20T12:00:00Z"),
        redeemedAt: null,
        revokedAt: null,
        updatedAt: new Date("2026-04-11T12:00:00Z"),
      },
      {
        id: "invite-revoked",
        email: "revoked@example.com",
        expiresAt: new Date("2026-04-20T12:00:00Z"),
        redeemedAt: null,
        revokedAt: new Date("2026-04-11T13:00:00Z"),
        updatedAt: new Date("2026-04-11T13:00:00Z"),
      },
    ];

    const { default: AdminPage } = await import("@/app/reading-river/admin/page");
    const page = await AdminPage();

    render(page);

    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoke invite for pending@example.com" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("revoked@example.com")).not.toBeInTheDocument();
  });
});
