import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHomePageData: vi.fn(),
}));

vi.mock("@/lib/reading-river/homepage-data", () => ({
  getHomePageData: mocks.getHomePageData,
}));

import {
  getDailyDigestItems,
  isLondonDailyDigestHour,
} from "@/lib/reading-river/daily-digest";

describe("daily digest helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("selects the featured homepage items for the digest", async () => {
    const now = new Date("2026-06-01T07:15:00Z");

    mocks.getHomePageData.mockResolvedValue({
      priorityRead: {
        id: "priority-1",
        title: "Priority read",
        sourceUrl: "https://example.com/priority",
        siteName: "Example",
        estimatedMinutes: 10,
        priorityScore: 9,
        status: "unread",
        pinned: false,
        tags: ["focus"],
      },
      streamRead: {
        id: "stream-1",
        title: "From the stream",
        sourceUrl: "https://example.com/stream",
        siteName: "Example",
        estimatedMinutes: 15,
        priorityScore: 4,
        status: "unread",
        pinned: false,
        tags: [],
      },
      selectedTimeBudgetMinutes: 15,
    });

    await expect(getDailyDigestItems({ userId: "user-1", now })).resolves.toEqual([
      expect.objectContaining({ id: "priority-1", title: "Priority read" }),
      expect.objectContaining({ id: "stream-1", title: "From the stream" }),
    ]);

    expect(mocks.getHomePageData).toHaveBeenCalledWith({
      userId: "user-1",
      now,
    });
  });

  it("uses the London morning hour in and out of daylight saving time", () => {
    expect(isLondonDailyDigestHour(new Date("2026-06-01T07:15:00Z"))).toBe(true);
    expect(isLondonDailyDigestHour(new Date("2026-12-01T08:15:00Z"))).toBe(true);
    expect(isLondonDailyDigestHour(new Date("2026-12-01T07:15:00Z"))).toBe(false);
  });

  it("asks the formatter for a two-digit London hour", () => {
    const dateTimeFormatMock = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(
        class {
          format: () => string;

          constructor() {
            this.format = () => "08";
          }
        } as unknown as typeof Intl.DateTimeFormat,
      );

    expect(isLondonDailyDigestHour(new Date("2026-06-01T07:15:00Z"))).toBe(true);

    expect(dateTimeFormatMock).toHaveBeenCalledWith("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/London",
    });
  });
});
