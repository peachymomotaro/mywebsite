import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeSpotlights } from "@/components/reading-river/home-spotlights";

const cards = Object.fromEntries(
  [null, 5, 10, 15, 30, 45].map((minutes) => [
    minutes === null ? "any" : String(minutes),
    { priority: <p>Priority {minutes ?? "any"}</p>, stream: <p>Stream {minutes ?? "any"}</p> },
  ]),
) as React.ComponentProps<typeof HomeSpotlights>["cards"];

describe("HomeSpotlights", () => {
  it("switches spotlights instantly without navigating to a new page", () => {
    window.history.replaceState(null, "", "/reading-river");
    render(<HomeSpotlights initialMinutes={null} cards={cards} />);
    fireEvent.click(screen.getByRole("link", { name: "5 min" }));
    expect(screen.getByText("Priority 5")).toBeInTheDocument();
    expect(window.location.search).toBe("?time=5");
    fireEvent.click(screen.getByRole("link", { name: "Any time" }));
    expect(screen.getByText("Stream any")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("restores the selected budget when using browser history", () => {
    window.history.replaceState(null, "", "/reading-river?time=10");
    render(<HomeSpotlights initialMinutes={10} cards={cards} />);
    window.history.replaceState(null, "", "/reading-river?time=30");
    fireEvent.popState(window);
    expect(screen.getByText("Priority 30")).toBeInTheDocument();
  });
});
