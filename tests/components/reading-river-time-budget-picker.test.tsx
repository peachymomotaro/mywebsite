import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeBudgetPicker } from "@/components/reading-river/time-budget-picker";

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

describe("TimeBudgetPicker", () => {
  it("keeps Reading River time filters inside the merged route", () => {
    render(<TimeBudgetPicker selectedMinutes={30} />);

    expect(screen.getByRole("link", { name: "Any time" })).toHaveAttribute("href", "/reading-river");
    expect(screen.getByRole("link", { name: "5 min" })).toHaveAttribute(
      "href",
      "/reading-river?time=5",
    );
    expect(screen.getByRole("link", { name: "30 min" })).toHaveAttribute(
      "href",
      "/reading-river?time=30",
    );
    expect(screen.getByRole("link", { name: "30 min" })).toHaveAttribute("aria-current", "page");
  });

  it("marks Any time as active when no time budget is selected", () => {
    render(<TimeBudgetPicker selectedMinutes={null} />);

    expect(screen.getByRole("link", { name: "Any time" })).toHaveAttribute("aria-current", "page");
  });
});
