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
    expect(screen.getByRole("heading", { name: "The Philosophy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reading and finishing" })).toBeInTheDocument();
    expect(screen.getByText(/Pieces arrive in a continuous stream/)).toBeInTheDocument();
    expect(screen.getByText(/pool holds up to five pieces/)).toBeInTheDocument();
    expect(screen.getByText(/Finishing an article plants a golden tree/)).toBeInTheDocument();
    expect(screen.getByText(/Each day the 16 articles in the river are chosen randomly/)).toBeInTheDocument();
    expect(screen.getByText(/unfolding the paper/)).toBeInTheDocument();
    expect(screen.queryByText(/gentle chance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Three pieces drift by at a time/)).not.toBeInTheDocument();
    expect(screen.queryByText(/under Still reading/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Drifted past/)).not.toBeInTheDocument();
    expect(container.querySelectorAll(".river-how-steps li")).toHaveLength(4);

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

    const extensionLinks = [screen.getByRole("link", { name: "Firefox extension" }), screen.getByRole("link", { name: "Chrome extension" })];

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

  it("links each painting the river quotes to its Wikipedia page", async () => {
    const { default: HowItWorksPage } = await import("@/app/reading-river/how-it-works/page");
    render(await HowItWorksPage());

    expect(screen.getByRole("heading", { name: "The Paintings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "John Constable, The Hay Wain" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/The_Hay_Wain",
    );
    expect(screen.getByRole("link", { name: "J. M. W. Turner, The Fighting Temeraire" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/The_Fighting_Temeraire",
    );
    const wikipediaLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("https://en.wikipedia.org/wiki/"));
    expect(wikipediaLinks).toHaveLength(13);
    expect(screen.getByText(/see if you can find them!/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Barge Haulers on the Volga" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Barge_Haulers_on_the_Volga",
    );
    expect(screen.getByRole("link", { name: "What Freedom!" })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Ilya_Repin");

    // Where each painting is stays hidden behind its own spoiler until opened.
    const spoilers = document.querySelectorAll("details.river-how-spoiler");
    // Repin's two set the colours, so they're in the note above rather than hidden.
    expect(spoilers).toHaveLength(11);
    spoilers.forEach((spoiler) => expect(spoiler).not.toHaveAttribute("open"));
    expect(spoilers[0].querySelector("summary")).toHaveTextContent("Spoiler");
  });
});
