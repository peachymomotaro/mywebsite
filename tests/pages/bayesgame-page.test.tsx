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
      screen.getByText(/The player and a nefarious AI known as the Optimiser search/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Click the map to run your first experiment.")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Optimiser personality" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Experiment map" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Experiment map" })).not.toContainElement(
      screen.getByText("Click the map to run your first experiment.")
    );
    expect(screen.getByText("Scoreboard")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to my website" })
    ).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("heading", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByText(/The goal is to score more than the Optimiser, an evil AI nemesis/i)).toBeInTheDocument();
    expect(screen.getByText(/You get a score by clicking in the grid/i)).toBeInTheDocument();
    expect(screen.getByText(/The lowest score is 0 and the highest is 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Green is good and blue is bad/i)).toBeInTheDocument();
    expect(screen.getByText(/Good luck/i)).toBeInTheDocument();
    expect(screen.getByText("Latest score")).toBeInTheDocument();
    expect(screen.getByText("Best score")).toBeInTheDocument();
    expect(screen.queryByText("Your best-so-far")).toBeNull();
    expect(screen.queryByText("GP best-so-far")).toBeNull();
    expect(screen.queryByRole("button", { name: /GP uncertainty/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /GP belief/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /GP score/i })).toBeNull();
  });
});
