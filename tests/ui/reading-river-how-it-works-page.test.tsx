import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ReadingRiverHowItWorksPage", () => {
  it("renders the practical guide and explains the ranking logic", async () => {
    const { default: HowItWorksPage } = await import("@/app/reading-river/how-it-works/page");
    const page = await HowItWorksPage();

    render(page);

    expect(
      screen.getByText(
        "Reading River is a way to lower the pressure to read everything and make calmer choices about what to read next.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If you want the deeper philosophy behind it, the influences are linked at the bottom\./i),
    ).toBeInTheDocument();

    const howItWorksHeading = screen.getByRole("heading", { name: "How it works" });
    const philosophyHeading = screen.getByRole("heading", { name: "Philosophy and influences" });

    expect(
      howItWorksHeading.compareDocumentPosition(philosophyHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      screen.getByText(/Find things that you think are worth reading\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Put the things you think are worthwhile into the river, and set how important something is to you by using the priority setting\./i,
      ),
    ).toBeInTheDocument();

    const randomPickExplanation = screen.getByText(
      /When you want to read something, return to the river and go fishing\. The left option is the 'most important' option based on the priority setting and the amount of time you have\. The right button is a randomly selected piece of reading\./i,
    );
    const algorithmExplanation = screen.getByText(
      /If you're interested, the priority algorithm for Reading River is as follows: if you choose a time budget, it first looks for unread or in-progress pieces that fit that budget, falling back to shorter options if needed, then sorts by priority, pinned status, reading time, and age\. If you do not choose a time budget, it prefers pinned items, then high-priority short reads, then high-priority long reads, then lower-priority short reads, then everything else\./i,
    );

    expect(
      randomPickExplanation.compareDocumentPosition(algorithmExplanation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("links to the cited influences explicitly", async () => {
    const { default: HowItWorksPage } = await import("@/app/reading-river/how-it-works/page");
    const page = await HowItWorksPage();

    render(page);

    expect(screen.getByRole("link", { name: "Oliver Burkeman on the river" })).toHaveAttribute(
      "href",
      "https://www.oliverburkeman.com/river",
    );
    expect(
      screen.getByRole("link", { name: "David Epstein, How To Improve Your Information Diet" }),
    ).toHaveAttribute("href", "https://davidepstein.substack.com/p/how-to-improve-your-information-diet");
    expect(
      screen.getByRole("link", { name: "Andy Matuschak, Spaced repetition systems can be used to program attention" }),
    ).toHaveAttribute(
      "href",
      "https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention",
    );
  });
});
