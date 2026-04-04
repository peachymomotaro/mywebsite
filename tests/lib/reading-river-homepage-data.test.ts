import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
    getOrCreateAppSettingsMock: vi.fn(),
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/settings", () => ({
  getOrCreateAppSettings: mocks.getOrCreateAppSettingsMock,
}));

import { getHomePageData } from "@/lib/reading-river/homepage-data";

function createPrismaMock() {
  const findMany = vi.fn();

  return {
    prismaMock: {
      readingItem: {
        findMany,
      },
    },
    findMany,
  };
}

describe("getHomePageData", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
    mocks.getOrCreateAppSettingsMock.mockReset();
    mocks.getOrCreateAppSettingsMock.mockResolvedValue({
      id: "settings-1",
      userId: "user-1",
      displayMode: "suggested",
      manualOrderActive: false,
      highPriorityThreshold: 7,
      shortReadThresholdMinutes: 25,
      defaultReadingSpeedWpm: 200,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    });
  });

  it("queries only active homepage candidates with the fields used for ranking and display", async () => {
    const context = createPrismaMock();

    mocks.setPrismaMock(context.prismaMock);
    context.findMany.mockResolvedValue([]);

    await expect(getHomePageData({ userId: "user-1" })).resolves.toEqual({
      priorityRead: null,
      streamRead: null,
      selectedTimeBudgetMinutes: null,
    });

    expect(context.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: {
          in: ["unread", "reading"],
        },
        readEvent: {
          is: null,
        },
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        siteName: true,
        estimatedMinutes: true,
        priorityScore: true,
        status: true,
        pinned: true,
        createdAt: true,
      },
    });
  });
});
