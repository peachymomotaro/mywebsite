import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ReadingRiverHowItWorksPage", () => {
  it("renders the practical guide before the philosophy section", async () => {
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
      screen.getByText(/Add things that look worth reading without treating them as immediate obligations\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use the time budget and your own priorities to shape what feels worth reading now\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This is not a form of spaced attention\./i),
    ).toBeInTheDocument();
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
