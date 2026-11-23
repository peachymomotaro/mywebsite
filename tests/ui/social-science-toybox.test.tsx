import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExperimentGame } from "@/app/experiments/social-science-toybox/_components/experiment-game";
import ToyboxPage from "@/app/experiments/social-science-toybox/page";
import { decisionGames, experiments, TOYBOX_PATH, type DecisionGameId } from "@/lib/social-science-toybox/games";
import * as results from "@/lib/social-science-toybox/results";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function play(id: DecisionGameId) {
  render(<ExperimentGame experiment={decisionGames.find((experiment) => experiment.id === id)!} />);
}

function compare() {
  fireEvent.click(screen.getByRole("button", { name: "Compare responses" }));
}

describe("Social Science Toybox", () => {
  it("offers an independent deep link for every experiment", () => {
    render(<ToyboxPage />);
    for (const { id, title } of experiments) {
      expect(screen.getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", `${TOYBOX_PATH}/${id}`);
    }
  });

  it("requires a valid decision, reveals money averages and resets without retaining answers", () => {
    play("dictator");
    const input = screen.getByRole("textbox", { name: "Amount in dollars" });
    const button = screen.getByRole("button", { name: "Compare responses" });
    expect(button).toBeDisabled();
    expect(screen.queryByText("AI responses")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "5.01" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("heading", { name: "How you compare" })).toHaveFocus();
    const comparison = within(screen.getByRole("region", { name: "Amount given" }));
    expect(comparison.getByText("Your response")).toBeInTheDocument();
    expect(comparison.getByText("$2.15")).toBeInTheDocument();
    expect(comparison.getByText("$2.03")).toBeInTheDocument();
    expect(comparison.getByText("$0")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose another experiment" })).toHaveAttribute("href", TOYBOX_PATH);
    expect(screen.getByText("How this differs from the original experiment")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(screen.getByRole("heading", { name: "The scenario" })).toHaveFocus();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByText("Your response")).not.toBeInTheDocument();
  });

  it.each([
    ["trust-sender", "$1.50", "Amount sent", "$2.05", "$1.56"],
    ["trust-returner", "40%", "Share returned", "46.6%", "45%"],
    ["prisoners-dilemma", "Purple", "Share choosing Orange", "63.6%", "69.8%"],
  ] as const)("shows the correct comparison for %s", (id, option, label, human, ai) => {
    play(id);
    fireEvent.click(screen.getByRole("radio", { name: option }));
    compare();
    const comparison = within(screen.getByRole("region", { name: label }));
    expect(comparison.getByText(human)).toBeInTheDocument();
    expect(comparison.getByText(ai)).toBeInTheDocument();
  });

  it("renders Public Goods with its valid-response count and hypothetical payoffs", () => {
    play("public-goods");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "4" } });
    compare();
    expect(screen.getByText("Park et al. participants, wave 1 · n = 1,050")).toBeInTheDocument();
    expect(screen.getByText("Claude Opus 5.5, survey and interview · n = 1,050")).toBeInTheDocument();
    expect(screen.getByText("$2.96")).toBeInTheDocument();
    expect(screen.getByText("$2.26")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Example payoffs" })).toBeInTheDocument();
  });

  it.each([
    [0.25, "Low bargaining power", "78.2%", "92.8%", "513"],
    [0.75, "High bargaining power", "63.3%", "31.5%", "539"],
  ] as const)("uses only the assigned power scenario during play", (draw, arm, human, ai, n) => {
    vi.spyOn(results, "assignPowerCondition").mockImplementation(() =>
      results.powerConditions[draw < 0.5 ? 0 : 1],
    );
    play("power-and-trust");
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));
    expect(screen.getByRole("heading", { name: /how much power/i })).toHaveFocus();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(screen.queryByRole("radio", { name: "Offer a free sample" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Neither" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Would you make a free sample for Kevin?" })).toHaveFocus();

    fireEvent.click(screen.getByRole("radio", { name: "Offer a free sample" }));
    compare();
    const assigned = within(screen.getByRole("region", { name: arm }));
    expect(assigned.getByRole("heading", { name: `${arm} · Your scenario` })).toBeInTheDocument();
    expect(assigned.getByText(human)).toBeInTheDocument();
    expect(assigned.getByText(ai)).toBeInTheDocument();
    expect(assigned.getByText(`Park et al. participants, wave 1 · n = ${n}`)).toBeInTheDocument();
  });

  it("labels unavailable human and AI comparisons without substituting values", () => {
    vi.spyOn(results, "gameComparison").mockReturnValue({ human: null, ai: null });
    play("dictator");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "1" } });
    compare();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    expect(within(screen.getByRole("region", { name: "Amount given" })).getByText("$1")).toBeInTheDocument();
  });
});
