import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ReadingRiverChangelogPage", () => {
  it("renders the intro and latest changelog entry from the local file", async () => {
    const { default: ChangelogPage } = await import("@/app/reading-river/changelog/page");
    const page = await ChangelogPage();

    render(page);

    expect(screen.getByRole("heading", { name: "Changelog" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "A running note of recent changes to Reading River, kept in code and published here for readers.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("18 April 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Daily rhythm and editing upgrades" })).toBeInTheDocument();
    expect(
      screen.getByText("Reading River now supports reminder cadence settings from the Preferences page."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Saved items can now be edited directly inside the app instead of only being re-added."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Invite management now includes resend and revoke controls for beta access."),
    ).toBeInTheDocument();
  });
});
