import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConflictGame } from "@/app/experiments/social-science-toybox/_components/conflict-game";
import {
  agreementOptions, assignConflictCondition, conflictScore, conflictStatements,
} from "@/lib/social-science-toybox/conflict";
import { TOYBOX_PATH } from "@/lib/social-science-toybox/games";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Stepping In", () => {
  it("uses equal-odds assignment and the archive's seven-point coding", () => {
    expect(assignConflictCondition(() => 0.499).id).toBe("intervened");
    expect(assignConflictCondition(() => 0.5).id).toBe("stayed-out");
    expect(conflictScore([7, 6, 2])).toBe(5);
    expect(conflictScore([1, 1, 1])).toBe(1);
    expect(conflictScore([7, 7, 7])).toBe(7);
    expect(conflictScore([7, 5])).toBeNull();
    expect(conflictScore([0, 4, 7])).toBeNull();
    expect(conflictScore([1, 4, 8])).toBeNull();
  });

  it.each([
    [0.25, "stepped in", "Recalled stepping in", "Recalled staying out", "3.83 / 7", "5.13 / 7", 523],
    [0.75, "stayed out", "Recalled staying out", "Recalled stepping in", "2.65 / 7", "2.57 / 7", 529],
  ] as const)("compares the reader only with the matched recall group", (draw, prompt, arm, other, human, ai, n) => {
    vi.spyOn(Math, "random").mockReturnValue(draw);
    render(<ConflictGame />);
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));

    expect(screen.getByRole("heading", { name: "Recall a conflict" })).toHaveFocus();
    expect(screen.getByText(new RegExp(`deliberately ${prompt}`))).toBeInTheDocument();
    const note = screen.getByRole("textbox", { name: /describe what happened/i });
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    expect(screen.getByRole("link", { name: "I can’t recall an example" })).toHaveAttribute("href", TOYBOX_PATH);
    fireEvent.change(note, { target: { value: " " } });
    expect(next).toBeDisabled();
    fireEvent.change(note, { target: { value: "Two friends disagreed over a plan." } });
    fireEvent.click(next);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rate three statements" })).toHaveFocus();
    const compare = screen.getByRole("button", { name: "Compare responses" });
    expect(compare).toBeDisabled();
    const choiceValues = [7, 6, 2];
    conflictStatements.forEach(({ label }, index) => {
      const select = screen.getByRole("combobox", { name: label });
      expect(select).toHaveValue("0");
      expect(within(select).getAllByRole("option").slice(1).map(({ textContent }) => textContent))
        .toEqual(agreementOptions.map((option) => option.label));
      fireEvent.change(select, { target: { value: String(choiceValues[index]) } });
    });
    fireEvent.click(compare);

    expect(screen.getByRole("heading", { name: "How you compare" })).toHaveFocus();
    const assignedPanel = within(screen.getByRole("region", { name: arm }));
    expect(assignedPanel.getByText("5.00 / 7")).toBeInTheDocument();
    expect(assignedPanel.getByText(human)).toBeInTheDocument();
    expect(assignedPanel.getByText(ai)).toBeInTheDocument();
    expect(assignedPanel.getAllByText(new RegExp(`n = ${n}`))).toHaveLength(2);
    expect(within(screen.getByRole("region", { name: other })).queryByText("Your response")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(screen.getByRole("heading", { name: "A conflict between friends" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
