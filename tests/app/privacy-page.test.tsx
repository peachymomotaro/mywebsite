import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("PrivacyPage", () => {
  it("publishes concise Reading River Chrome extension privacy terms", async () => {
    const { default: PrivacyPage, metadata } = await import("@/app/privacy/page");
    const page = await PrivacyPage();

    render(page);

    expect(metadata).toEqual({
      title: "Privacy Policy",
      description: "Privacy policy for the Reading River Chrome extension.",
    });

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Privacy Policy for Reading River",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/email address and password to Reading River so your account can be authenticated/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The full page text is not sent to Reading River by the extension\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not transfer user data to third parties for advertising, creditworthiness, lending/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "curry.peter@googlemail.com" })).toHaveAttribute(
      "href",
      "mailto:curry.peter@googlemail.com",
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
