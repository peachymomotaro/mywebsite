import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BetaPage from "@/app/reading-river/beta/page";
import InviteEntryPage from "@/app/reading-river/invite/page";
import LoginPage from "@/app/reading-river/login/page";

const mocks = vi.hoisted(() => ({
  getInviteRedemptionState: vi.fn(),
  getPasswordResetState: vi.fn(),
}));

vi.mock("@/lib/reading-river/invites", () => ({
  getInviteRedemptionState: mocks.getInviteRedemptionState,
}));

vi.mock("@/lib/reading-river/password-resets", () => ({
  getPasswordResetState: mocks.getPasswordResetState,
}));

vi.mock("@/app/reading-river/invite/[token]/actions", () => ({
  redeemInviteAction: vi.fn(async () => {}),
}));

vi.mock("@/app/reading-river/reset-password/[token]/actions", () => ({
  resetPasswordAction: vi.fn(async () => {}),
}));

describe("Reading River auth entry pages", () => {
  beforeEach(() => {
    mocks.getInviteRedemptionState.mockReset();
  });

  it("renders the login page through the shared auth shell", async () => {
    const page = await LoginPage();

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Enter the stream" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="auth-shell"]')).toBeInTheDocument();
  });

  it("renders the invite-entry page through the shared auth shell", async () => {
    const page = await InviteEntryPage();

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Redeem your invite" })).toBeInTheDocument();
    expect(screen.getByLabelText("Invite link or token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="auth-shell"]')).toBeInTheDocument();
  });

  it("renders the valid invite-redemption flow through the shared auth shell", async () => {
    mocks.getInviteRedemptionState.mockResolvedValue({
      status: "valid",
      invite: {
        email: "reader@example.com",
      },
    });

    const { default: InviteRedemptionPage } = await import("@/app/reading-river/invite/[token]/page");
    const page = await InviteRedemptionPage({
      params: Promise.resolve({
        token: "invite-token",
      }),
    });

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Accept your invite" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("reader@example.com")).toBeDisabled();
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="auth-shell"]')).toBeInTheDocument();
  });

  it("renders the valid password reset flow through the shared auth shell", async () => {
    mocks.getPasswordResetState.mockResolvedValue({
      status: "valid",
      resetToken: {
        user: {
          email: "reader@example.com",
        },
      },
    });

    const { default: ResetPasswordPage } = await import("@/app/reading-river/reset-password/[token]/page");
    const page = await ResetPasswordPage({
      params: Promise.resolve({
        token: "reset-token",
      }),
    });

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("reader@example.com")).toBeDisabled();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="auth-shell"]')).toBeInTheDocument();
  });

  it("keeps the beta entry actions inside the shared auth actions wrapper", async () => {
    const page = await BetaPage();

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Reading River beta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/reading-river/login",
    );
    expect(screen.getByRole("link", { name: "Redeem invite" })).toHaveAttribute(
      "href",
      "/reading-river/invite",
    );
    expect(container.querySelector('[data-slot="auth-actions"]')).toBeInTheDocument();
  });
});
