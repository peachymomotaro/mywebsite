import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ReadingRiverChangelogPage", () => {
  it("renders the intro and latest changelog entry from the local file", async () => {
    const { default: ChangelogPage } = await import("@/app/reading-river/changelog/page");
    const page = await ChangelogPage();

    render(page);

    expect(screen.getByRole("heading", { name: "Changelog" })).toBeInTheDocument();
    expect(screen.getByText("A record of changes to Reading River.")).toBeInTheDocument();
    expect(screen.getByText("27 April 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book Roulette and priority tuning" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Made the priority option slightly less deterministic so you're not just staring at the same thing you haven't read day after day.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Changed manual items to books, and took them out of the priority queue. Now books show up in book roulette, at the bottom of the front page. You can also receive your daily book roulette by email, if you'd like to be reminded about books you wanted to read.",
      ),
    ).toBeInTheDocument();
  });
});
