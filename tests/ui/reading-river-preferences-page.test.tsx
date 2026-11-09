import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
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
      includeBookRouletteInDigest: true,
      priorityRandomPoolSize: 5,
    });

    const page = await PreferencesPage({});

    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByText("Choose how often Reading River should send your reminder email.")).toBeInTheDocument();
    const cadence = screen.getByRole("group", { name: "Email cadence" });
    for (const name of ["Off", "Daily", "Every other day", "Weekly", "Monthly", "Seasonal (every three months)"]) {
      expect(within(cadence).getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(within(cadence).getByRole("radio", { name: "Every other day" })).toBeChecked();
    expect(within(cadence).getByRole("radio", { name: "Daily" })).not.toBeChecked();
    expect(container.querySelector("select")).toBeNull();
    expect(screen.queryByLabelText("Priority rotation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Include Book Roulette in reminder emails")).not.toBeInTheDocument();
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
      includeBookRouletteInDigest: false,
      priorityRandomPoolSize: 3,
    });

    const page = await PreferencesPage({
      searchParams: Promise.resolve({
        saved: "1",
      }),
    });

    const { container } = render(page);

    expect(screen.getByText("Preferences saved.")).toBeInTheDocument();
    expect(screen.getByText("Preferences saved.")).toHaveAttribute("role", "status");
    expect(container.querySelector(".editorial-panel")).toBeNull();
    expect(container.querySelector(".river-preferences-feedback")).not.toBeNull();
  });
});
