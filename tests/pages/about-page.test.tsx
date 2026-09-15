import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error -- the legacy Pages Router page is JavaScript without declarations.
import About from "@/pages/about";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("About page", () => {
  it("focuses on Peter's role at Lucid Dot", () => {
    render(<About />);

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByText(/CTO and Co-Founder at Lucid Dot/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lucid Dot" })).toHaveAttribute(
      "href",
      "https://www.luciddot.com/"
    );
  });

  it("does not present CV content or a CV download", () => {
    render(<About />);

    expect(screen.queryByText(/Download CV/i)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Experience" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Education" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Skills" })).toBeNull();
  });
});
