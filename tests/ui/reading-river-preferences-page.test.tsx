import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUserMock: vi.fn(),
  getOrCreateAppSettingsMock: vi.fn(),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: mocks.requireCurrentUserMock,
}));

vi.mock("@/lib/reading-river/settings", () => ({
  getOrCreateAppSettings: mocks.getOrCreateAppSettingsMock,
}));

describe("ReadingRiverPreferencesPage", () => {
  it("renders the preferences toggle for the current reader", async () => {
    const { default: PreferencesPage } = await import("@/app/reading-river/preferences/page");

    mocks.requireCurrentUserMock.mockResolvedValue({
      id: "user-1",
    });
    mocks.getOrCreateAppSettingsMock.mockResolvedValue({
      dailyDigestEnabled: false,
    });

    const page = await PreferencesPage();

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Receive a daily email with two picks from your River."),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Receive a daily email with two picks from your River.")).toHaveClass(
      "river-preferences-checkbox",
    );
    expect(container.querySelector(".editorial-page-kicker")).not.toBeInTheDocument();
    expect(container.querySelector(".river-preferences-choice")).not.toBeNull();
  });
});
