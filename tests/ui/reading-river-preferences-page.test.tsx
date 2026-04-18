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
  it("renders the reminder cadence choices for the current reader", async () => {
    const { default: PreferencesPage } = await import("@/app/reading-river/preferences/page");

    mocks.requireCurrentUserMock.mockResolvedValue({
      id: "user-1",
    });
    mocks.getOrCreateAppSettingsMock.mockResolvedValue({
      digestCadence: "every_other_day",
    });

    const page = await PreferencesPage();

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByText("Choose how often Reading River should send your reminder email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reminder cadence")).toHaveValue("every_other_day");
    expect(screen.getByRole("option", { name: "Off" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Daily" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Every other day" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Seasonal (every three months)" })).toBeInTheDocument();
    const helperCopy = screen.getByText(/08:00 London time/i);
    expect(helperCopy).toBeInTheDocument();
    expect(helperCopy).toHaveClass("river-preferences-description");
    expect(container.querySelector(".editorial-page-kicker")).not.toBeInTheDocument();
    expect(container.querySelector(".river-preferences-choice")).not.toBeNull();
    expect(container.querySelector(".river-preferences-feedback")).toBeNull();
  });

  it("shows a compact saved confirmation below the save button", async () => {
    const { default: PreferencesPage } = await import("@/app/reading-river/preferences/page");

    mocks.requireCurrentUserMock.mockResolvedValue({
      id: "user-1",
    });
    mocks.getOrCreateAppSettingsMock.mockResolvedValue({
      digestCadence: "daily",
    });

    const page = await PreferencesPage({
      searchParams: {
        saved: "1",
      },
    });

    const { container } = render(page);

    expect(screen.getByText("Preferences saved.")).toBeInTheDocument();
    expect(screen.getByText("Preferences saved.")).toHaveAttribute("role", "status");
    expect(container.querySelectorAll(".editorial-panel")).toHaveLength(1);
    expect(container.querySelector(".river-preferences-feedback")).not.toBeNull();
  });
});
