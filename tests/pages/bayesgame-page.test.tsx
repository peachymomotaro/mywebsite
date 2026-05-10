import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BayesGamePage from "@/pages/bayesgame";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Bayes game page", () => {
  it("renders the hidden Bayesian optimisation game route", () => {
    render(<BayesGamePage />);

    expect(
      screen.getByRole("heading", { name: "Beat the Bayesian optimiser" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The player and a toy Gaussian-process optimiser search/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Optimiser personality" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Experiment map" })
    ).toBeInTheDocument();
    expect(screen.getByText("Scoreboard")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to my website" })
    ).toHaveAttribute("href", "/projects");
  });
});
