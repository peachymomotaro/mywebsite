import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    getDailyDigestItems: vi.fn(),
    sendReadingRiverDailyDigestEmail: vi.fn(),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: routeMocks.getPrismaClient,
}));

vi.mock("@/lib/reading-river/daily-digest", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reading-river/daily-digest")>(
    "@/lib/reading-river/daily-digest",
  );

  return {
    ...actual,
    getDailyDigestItems: routeMocks.getDailyDigestItems,
  };
});

vi.mock("@/lib/reading-river/email", () => ({
  sendReadingRiverDailyDigestEmail: routeMocks.sendReadingRiverDailyDigestEmail,
}));

import { GET } from "@/app/api/reading-river/daily-digest/route";

function authorizedRequest() {
  return new Request("https://example.com/api/reading-river/daily-digest", {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
}

function createSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: "settings-1",
    userId: "user-1",
    dailyDigestEnabled: true,
    lastDailyDigestSentAt: null,
    user: {
      id: "user-1",
      email: "reader@example.com",
      displayName: "River Reader",
    },
    ...overrides,
  };
}

describe("reading river daily digest route", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    vi.useFakeTimers();
    routeMocks.getPrismaClient.mockClear();
    routeMocks.getDailyDigestItems.mockReset();
    routeMocks.sendReadingRiverDailyDigestEmail.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();

    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://example.com/api/reading-river/daily-digest"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized",
    });
  });

  it("skips requests outside the London digest window", async () => {
    vi.setSystemTime(new Date("2026-12-01T07:15:00Z"));
    routeMocks.setPrismaMock({
      appSettings: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      skipped: true,
      reason: "outside-window",
    });
  });

  it("sends one digest email and updates the send timestamp", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const findManyMock = vi.fn(async () => [createSettings()]);
    const updateMock = vi.fn(async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => ({
      id: "settings-1",
      where,
      data,
    }));

    routeMocks.setPrismaMock({
      appSettings: {
        findMany: findManyMock,
        update: updateMock,
      },
    });
    routeMocks.getDailyDigestItems.mockResolvedValue([
      {
        id: "item-1",
        title: "Priority read",
        sourceUrl: "https://example.com/article",
      },
    ]);
    routeMocks.sendReadingRiverDailyDigestEmail.mockResolvedValue({ id: "email-1" });

    const response = await GET(authorizedRequest());

    expect(routeMocks.sendReadingRiverDailyDigestEmail).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { lastDailyDigestSentAt: expect.any(Date) },
    });
    expect(await response.json()).toMatchObject({
      sent: 1,
      skipped: 0,
    });
  });

  it("skips users who already received a digest on the same London-local day", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const findManyMock = vi.fn(async () => [
      createSettings({
        lastDailyDigestSentAt: new Date("2026-05-31T23:30:00Z"),
      }),
    ]);
    const updateMock = vi.fn();

    routeMocks.setPrismaMock({
      appSettings: {
        findMany: findManyMock,
        update: updateMock,
      },
    });
    routeMocks.getDailyDigestItems.mockResolvedValue([
      {
        id: "item-1",
        title: "Priority read",
        sourceUrl: "https://example.com/article",
      },
    ]);

    const response = await GET(authorizedRequest());

    expect(routeMocks.sendReadingRiverDailyDigestEmail).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      sent: 0,
      skipped: 1,
    });
  });

  it("skips users with zero digest items", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const findManyMock = vi.fn(async () => [createSettings()]);
    const updateMock = vi.fn();

    routeMocks.setPrismaMock({
      appSettings: {
        findMany: findManyMock,
        update: updateMock,
      },
    });
    routeMocks.getDailyDigestItems.mockResolvedValue([]);

    const response = await GET(authorizedRequest());

    expect(routeMocks.sendReadingRiverDailyDigestEmail).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      sent: 0,
      skipped: 1,
    });
  });
});
