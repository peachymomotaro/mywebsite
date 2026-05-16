import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ReadingRiverHowItWorksPage", () => {
  it("renders the practical guide and explains the ranking logic", async () => {
    const { default: HowItWorksPage } = await import("@/app/reading-river/how-it-works/page");
    const page = await HowItWorksPage();

    const { container } = render(page);

    expect(
      screen.getByText(
        "Reading River is a way to lower the pressure to read everything and make calmer choices about what to read next.",
      ),
    ).toBeInTheDocument();
    expect(container.querySelector(".editorial-page-kicker")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Philosophy and How It Works" }),
    ).toBeInTheDocument();

    const howItWorksHeading = screen.getByRole("heading", { name: "How It Works" });
    const philosophyHeading = screen.getByRole("heading", { name: "The Philosophy and How It Works" });

    expect(
      howItWorksHeading.compareDocumentPosition(philosophyHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      screen.getByText(/Find things that you think are worth reading\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Put the things you think are worthwhile into the river, where they become fiches\. Set how important a fiche is to you by using the priority setting\./i,
      ),
    ).toBeInTheDocument();

    const randomPickIntro = screen.getByText(
      /When you want to read something, return to the river and go ficheing\./i,
    );
    const randomPickExplanation = screen.getByText(
      /The left option is the 'most important' option based on the priority setting and the amount of time you have\. The right button is a randomly selected piece of reading\./i,
    );
    const algorithmIntro = screen.getByText(
      /If you're interested, the priority algorithm for Reading River is as follows:/i,
    );
    expect(
      screen.getByText(
        /If you set how long you have to read, it first winnows your list down to pieces that fit that budget, falling back to shorter options if needed\. Then it sorts by a simple equation that considers the priority, reading time, and age\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /If you do not choose a time budget, it prefers high-priority short reads, then high-priority long reads, then lower-priority short reads, and then everything else\./i,
      ),
    ).toBeInTheDocument();

    expect(
      randomPickIntro.compareDocumentPosition(randomPickExplanation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      randomPickExplanation.compareDocumentPosition(algorithmIntro) &
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
