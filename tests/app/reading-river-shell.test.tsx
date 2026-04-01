import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { EditorialShell } from "@/app/reading-river/layout";

const mocks = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  getCurrentUser: mocks.getCurrentUserMock,
}));

describe("EditorialShell", () => {
  it("keeps Reading River navigation inside the prefixed route space", () => {
    render(
      <EditorialShell isAdmin={true}>
        <div>child</div>
      </EditorialShell>
    );

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
  });
});

describe("RootLayout", () => {
  async function renderShellForUser(user: unknown) {
    mocks.getCurrentUserMock.mockResolvedValue(user);

    const page = await RootLayout({
      children: <main>child</main>,
    });
    const body = page.props.children as { props: { children: ReactNode } };

    render(body.props.children);
  }

  it("shows admin navigation for admin users", async () => {
    await renderShellForUser({
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin Reader",
      passwordHash: "hash",
      status: "active",
      isAdmin: true,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    });

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
  });

  it("hides admin navigation for non-admin users", async () => {
    await renderShellForUser({
      id: "user-2",
      email: "reader@example.com",
      displayName: "River Reader",
      passwordHash: "hash",
      status: "active",
      isAdmin: false,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    });

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("hides admin navigation for logged-out users", async () => {
    await renderShellForUser(null);

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});
