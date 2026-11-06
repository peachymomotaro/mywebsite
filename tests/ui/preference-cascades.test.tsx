import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FigureLesson from "@/app/experiments/preference-cascades/_components/figure-lesson";
import ThresholdLesson from "@/app/experiments/preference-cascades/_components/threshold-lesson";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("original diagram interactions", () => {
  it("steps from 20% to 35%, resets, and supports keyboard selection on the graph", () => {
    render(<FigureLesson />);
    expect(screen.getByTestId("figure-current")).toHaveTextContent("20%");
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("35%");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("20%");
    fireEvent.keyDown(screen.getByRole("slider", { name: "Choose expectation on the graph" }), { key: "End" });
    expect(screen.getByLabelText("Initial expectation")).toHaveValue("100");
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("95%");
  });

  it("pauses, cancels pending playback when conditions change, and stops at equilibrium", () => {
    vi.useFakeTimers();
    render(<FigureLesson />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(750));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("35%");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("35%");
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.change(screen.getByLabelText("Initial expectation"), { target: { value: "40" } });
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByTestId("figure-current")).toHaveTextContent("40%");
    expect(screen.getByRole("button", { name: "Step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Replay" })).toBeDisabled();
  });
});

describe("cascade extension", () => {
  it("compares the same starting expectation and population, changing one threshold", () => {
    render(<ThresholdLesson />);
    expect(screen.getByTestId("baseline-outcome")).toHaveTextContent("10%");
    expect(screen.getByTestId("changed-outcome")).toHaveTextContent("10%");
    fireEvent.click(screen.getByRole("button", { name: "Lower person 2 to 10%" }));
    expect(screen.getByTestId("baseline-outcome")).toHaveTextContent("10%");
    expect(screen.getByTestId("changed-outcome")).toHaveTextContent("100%");
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByTestId("threshold-current")).toHaveTextContent("10%");
    expect(screen.getAllByText("Speaking")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Person 2’s threshold"), { target: { value: "30" } });
    expect(screen.getByTestId("changed-outcome")).toHaveTextContent("10%");
    expect(screen.getByTestId("threshold-current")).toHaveTextContent("0%");
  });
});
