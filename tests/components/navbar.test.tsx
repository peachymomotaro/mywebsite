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

vi.mock("next/navigation", () => ({
  usePathname: () => "/blog",
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <button type="button">Theme</button>,
}));

describe("NavBar", () => {
  it("links to the main sections and marks the current page", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: "Peter Curry" })).toHaveAttribute("href", "/");
    for (const [name, href] of [
      ["Blog", "/blog"],
      ["Projects", "/projects"],
      ["Podcasts", "/podcasts"],
      ["Contact", "/contact"],
    ]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Projects" })).not.toHaveAttribute("aria-current");
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
