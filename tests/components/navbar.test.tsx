import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NavBar from "@/components/NavBar";

const globalStyles = readFileSync(
  path.resolve(process.cwd(), "styles/globals.css"),
  "utf8"
);

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

    const readingRiverLink = screen.getByRole("link", { name: "Reading River" });

    expect(readingRiverLink).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(globalStyles).toMatch(
      /\.nav-links a\s*\{[^}]*white-space:\s*nowrap;/s
    );
  });

  it("does not expose the Bayesian optimisation game in the main navigation", () => {
    render(<NavBar />);

    expect(screen.queryByRole("link", { name: /Bayesian optimisation game/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Bayes/i })).toBeNull();
  });
});
