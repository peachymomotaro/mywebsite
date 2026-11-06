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
        /Put the things you think are worthwhile into the river, where they become fiches\. Paste a link and we fetch its title and reading time for you\./i,
      ),
    ).toBeInTheDocument();

    const randomPickIntro = screen.getByText(
      /When you want to read something, return to the river and go ficheing\./i,
    );
    const randomPickExplanation = screen.getByText(
      /Three pieces drift by at a time\. Choose one to bring it to the bank, or let them drift on and three others will come into view\./i,
    );
    const algorithmIntro = screen.getByText(
      /If you're interested, here is how the river chooses what drifts by:/i,
    );
    expect(
      screen.getByText(
        /every piece has the same chance as any other/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Anything you open stays on the bank, under Still reading, until you mark it as read/i,
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

  it("links to the Firefox and Chrome extensions in the basics", async () => {
    const { default: HowItWorksPage } = await import("@/app/reading-river/how-it-works/page");
    const page = await HowItWorksPage();

    render(page);

    expect(screen.queryByText(/I plan to add a Chrome extension soon\./i)).not.toBeInTheDocument();

    const extensionLinks = screen.getAllByRole("link", { name: "here" });

    expect(extensionLinks).toHaveLength(2);
    expect(extensionLinks[0]).toHaveAttribute(
      "href",
      "https://addons.mozilla.org/en-GB/firefox/addon/reading-river/",
    );
    expect(extensionLinks[1]).toHaveAttribute(
      "href",
      "https://chromewebstore.google.com/detail/reading-river/gclbpodffcebdmecehkolmejiopfjhnl",
    );
  });
});
