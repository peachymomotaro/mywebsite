import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout, { EditorialShell, metadata, preferredRegion } from "@/app/reading-river/layout";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a data-next-link="true" href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: {
    alt: string;
    src: string;
  }) => <img alt={alt} src={src} {...props} />,
}));

const mocks = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  getCurrentUser: mocks.getCurrentUserMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathnameMock,
}));

describe("EditorialShell", () => {
  beforeEach(() => {
    mocks.usePathnameMock.mockReturnValue("/reading-river");
  });

  it("pins the Reading River subtree to the London function region", () => {
    expect(preferredRegion).toBe("lhr1");
  });

  it("uses the Reading River icon as the route app mark", () => {
    expect(metadata.icons).toEqual({
      icon: "/reading-river-icon.png",
      apple: "/reading-river-icon.png",
    });
  });

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
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(
      screen.getByRole("link", { name: "Reading River" }).querySelector(".river-shell-brand-mark"),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "href",
      "/reading-river/how-it-works"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "href",
      "/reading-river/preferences"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
  });

  it("keeps the shell navigation visible on the read history route", () => {
    mocks.usePathnameMock.mockReturnValue("/reading-river/history");

    render(
      <EditorialShell isAdmin={false}>
        <div>child</div>
      </EditorialShell>
    );

    expect(screen.getByRole("link", { name: "How It Works" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read history" })).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "href",
      "/reading-river/how-it-works"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "href",
      "/reading-river/preferences"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "data-next-link",
      "true"
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
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "href",
      "/reading-river/how-it-works"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("hides admin navigation for logged-out users", async () => {
    await renderShellForUser(null);

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "href",
      "/reading-river/how-it-works"
    );
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "href",
      "/reading-river/preferences"
    );
    expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
      "data-next-link",
      "true"
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});
