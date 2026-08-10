import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NameRankerPage from "@/pages/name-ranker";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Name ranker page", () => {
  it("renders as a private standalone voting page", () => {
    render(<NameRankerPage />);

    expect(NameRankerPage.hideSiteLayout).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Which name wins?" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Your name or initials")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to my website" })
    ).toHaveAttribute("href", "/projects");
  });
});
