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

import { buildHomePageData, getHomePageData } from "@/lib/reading-river/homepage-data";

function createPrismaMock() {
  const readingItemFindMany = vi.fn();
  const bookFindMany = vi.fn();

  return {
    prismaMock: {
      readingItem: {
        findMany: readingItemFindMany,
      },
      book: {
        findMany: bookFindMany,
      },
    },
    readingItemFindMany,
    bookFindMany,
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
    context.readingItemFindMany.mockResolvedValue([]);
    context.bookFindMany.mockResolvedValue([]);

    await expect(getHomePageData({ userId: "user-1" })).resolves.toEqual({
      priorityRead: null,
      streamRead: null,
      bookRoulettePick: null,
      selectedTimeBudgetMinutes: null,
    });

    expect(context.readingItemFindMany).toHaveBeenCalledWith({
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
        sourceType: true,
        sourceUrl: true,
        siteName: true,
        estimatedMinutes: true,
        priorityScore: true,
        status: true,
        pinned: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    expect(context.bookFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
      select: {
        id: true,
        title: true,
        author: true,
        notes: true,
        createdAt: true,
      },
    });
  });

  it("keeps stream-only items out of the left card while allowing them in the right card", () => {
    const data = buildHomePageData(
      [
        {
          id: "item-priority",
          title: "Priority essay",
          sourceType: "url",
          sourceUrl: "https://example.com/priority",
          siteName: "Example",
          estimatedMinutes: 10,
          priorityScore: 8,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-01T12:00:00Z"),
          tags: [],
        },
        {
          id: "item-stream",
          title: "Stream-only note",
          sourceType: "url",
          sourceUrl: "https://example.com/stream",
          siteName: "Example",
          estimatedMinutes: 6,
          priorityScore: null,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-02T12:00:00Z"),
          tags: [],
        },
      ],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
      },
      {
        dayKey: "2026-06-03",
      },
    );

    expect(data.priorityRead?.id).toBe("item-priority");
    expect(data.streamRead?.id).toBe("item-stream");
  });

  it("keeps the priority read fixed for a day while choosing from the top three ranked candidates", () => {
    const items = [
      {
        id: "rank-1",
        title: "Top priority",
        sourceType: "url",
        sourceUrl: "https://example.com/one",
        siteName: "Example",
        estimatedMinutes: 10,
        priorityScore: 10,
        status: "unread" as const,
        pinned: false,
        createdAt: new Date("2026-06-01T12:00:00Z"),
        tags: [],
      },
      {
        id: "rank-2",
        title: "Second priority",
        sourceType: "url",
        sourceUrl: "https://example.com/two",
        siteName: "Example",
        estimatedMinutes: 10,
        priorityScore: 9,
        status: "unread" as const,
        pinned: false,
        createdAt: new Date("2026-06-02T12:00:00Z"),
        tags: [],
      },
      {
        id: "rank-3",
        title: "Third priority",
        sourceType: "url",
        sourceUrl: "https://example.com/three",
        siteName: "Example",
        estimatedMinutes: 10,
        priorityScore: 8,
        status: "unread" as const,
        pinned: false,
        createdAt: new Date("2026-06-03T12:00:00Z"),
        tags: [],
      },
      {
        id: "rank-4",
        title: "Fourth priority",
        sourceType: "url",
        sourceUrl: "https://example.com/four",
        siteName: "Example",
        estimatedMinutes: 10,
        priorityScore: 7,
        status: "unread" as const,
        pinned: false,
        createdAt: new Date("2026-06-04T12:00:00Z"),
        tags: [],
      },
    ];
    const settings = {
      displayMode: "suggested" as const,
      manualOrderActive: false,
      highPriorityThreshold: 7,
      shortReadThresholdMinutes: 25,
    };
    const lowRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const firstPick = buildHomePageData(items, settings, {
      dayKey: "2026-06-05",
    }).priorityRead;

    lowRandomSpy.mockReturnValue(0.99);

    const secondPick = buildHomePageData(items, settings, {
      dayKey: "2026-06-05",
    }).priorityRead;

    lowRandomSpy.mockRestore();

    expect(secondPick).toEqual(firstPick);
    expect(firstPick?.id).not.toBe("rank-4");
  });

  it("uses the configured priority rotation size when choosing the daily priority read", () => {
    const data = buildHomePageData(
      [
        {
          id: "alpha",
          title: "Top priority",
          sourceType: "url",
          sourceUrl: "https://example.com/one",
          siteName: "Example",
          estimatedMinutes: 10,
          priorityScore: 10,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-01T12:00:00Z"),
          tags: [],
        },
        {
          id: "beta",
          title: "Second priority",
          sourceType: "url",
          sourceUrl: "https://example.com/two",
          siteName: "Example",
          estimatedMinutes: 10,
          priorityScore: 9,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-02T12:00:00Z"),
          tags: [],
        },
      ],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
        priorityRandomPoolSize: 1,
      },
      {
        dayKey: "2026-06-05",
      },
    );

    expect(data.priorityRead?.id).toBe("alpha");

    const widerRotationData = buildHomePageData(
      [
        {
          id: "alpha",
          title: "Top priority",
          sourceType: "url",
          sourceUrl: "https://example.com/one",
          siteName: "Example",
          estimatedMinutes: 10,
          priorityScore: 10,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-01T12:00:00Z"),
          tags: [],
        },
        {
          id: "beta",
          title: "Second priority",
          sourceType: "url",
          sourceUrl: "https://example.com/two",
          siteName: "Example",
          estimatedMinutes: 10,
          priorityScore: 9,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-02T12:00:00Z"),
          tags: [],
        },
      ],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
        priorityRandomPoolSize: 2,
      },
      {
        dayKey: "2026-06-05",
      },
    );

    expect(widerRotationData.priorityRead?.id).toBe("beta");
  });

  it("keeps manual and book chapter items out of the homepage article cards", () => {
    const data = buildHomePageData(
      [
        {
          id: "manual-1",
          title: "Old manual note",
          sourceType: "manual",
          sourceUrl: null,
          siteName: null,
          estimatedMinutes: 5,
          priorityScore: 10,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-01T12:00:00Z"),
          tags: [],
        },
        {
          id: "chapter-1",
          title: "Old book chapter",
          sourceType: "book_chapter",
          sourceUrl: null,
          siteName: null,
          estimatedMinutes: 8,
          priorityScore: 9,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-02T12:00:00Z"),
          tags: [],
        },
        {
          id: "article-1",
          title: "Actual article",
          sourceType: "url",
          sourceUrl: "https://example.com/article",
          siteName: "Example",
          estimatedMinutes: 12,
          priorityScore: 8,
          status: "unread",
          pinned: false,
          createdAt: new Date("2026-06-03T12:00:00Z"),
          tags: [],
        },
      ],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
      },
      {
        dayKey: "2026-06-04",
      },
    );

    expect(data.priorityRead?.id).toBe("article-1");
    expect(data.streamRead).toBeNull();
  });

  it("chooses the book roulette pick deterministically from the book pool for each day", () => {
    const books = [
      {
        id: "book-1",
        title: "First Book",
        author: "A. Writer",
        notes: "For the autumn stack.",
        createdAt: new Date("2026-06-01T12:00:00Z"),
      },
      {
        id: "book-2",
        title: "Second Book",
        author: null,
        notes: null,
        createdAt: new Date("2026-06-02T12:00:00Z"),
      },
      {
        id: "book-3",
        title: "Third Book",
        author: "C. Writer",
        notes: "Short and strange.",
        createdAt: new Date("2026-06-03T12:00:00Z"),
      },
    ];

    const firstPick = buildHomePageData(
      [],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
      },
      {
        dayKey: "2026-06-05",
        books,
      },
    ).bookRoulettePick;
    const secondPick = buildHomePageData(
      [],
      {
        displayMode: "suggested",
        manualOrderActive: false,
        highPriorityThreshold: 7,
        shortReadThresholdMinutes: 25,
      },
      {
        dayKey: "2026-06-05",
        books: books.toReversed(),
      },
    ).bookRoulettePick;

    expect(firstPick).not.toBeNull();
    expect(secondPick).toEqual(firstPick);
  });
});
