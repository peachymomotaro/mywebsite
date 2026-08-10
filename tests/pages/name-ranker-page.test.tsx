import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.queryByText("BUSINESS NAME RANKER")).toBeNull();
    expect(
      screen.getByLabelText("Your name or initials")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to my website" })
    ).toHaveAttribute("href", "/projects");
  });

  it("uses Floating City in the voting choices", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<NameRankerPage />);

    fireEvent.change(screen.getByLabelText("Your name or initials"), {
      target: { value: "Peter" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start ranking" }));

    expect(
      screen.getByRole("button", { name: "Floating City" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Floating World" })).toBeNull();
  });
});
