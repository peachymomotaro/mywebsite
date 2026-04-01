import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NavBar from "@/components/NavBar";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <button type="button">Theme</button>,
}));

describe("NavBar", () => {
  it("links to Reading River from the main site navigation", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
  });
});
