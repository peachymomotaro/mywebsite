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

function cloneSettings(setting: ReturnType<typeof createSettings>) {
  return {
    ...setting,
    lastDailyDigestSentAt: setting.lastDailyDigestSentAt
      ? new Date(setting.lastDailyDigestSentAt as Date)
      : null,
    user: {
      ...setting.user,
    },
  };
}

function getLondonDayKey(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Failed to compute London day key.");
  }

  return `${year}-${month}-${day}`;
}

function createAppSettingsPrismaMock(initialSettings: Array<ReturnType<typeof createSettings>>) {
  const storedSettings = new Map(
    initialSettings.map((setting) => [setting.userId, cloneSettings(setting)]),
  );
  const initialSnapshot = initialSettings.map((setting) => cloneSettings(setting));

  const findMany = vi.fn(async () => initialSnapshot.map((setting) => cloneSettings(setting)));
  const updateMany = vi.fn(async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => {
    const setting = storedSettings.get(where.userId);

    if (!setting) {
      return { count: 0 };
    }

    const nextSentAt = data.lastDailyDigestSentAt as Date | null | undefined;

    if (
      setting.lastDailyDigestSentAt &&
      nextSentAt &&
      getLondonDayKey(setting.lastDailyDigestSentAt) === getLondonDayKey(nextSentAt)
    ) {
      return { count: 0 };
    }

    if (Object.prototype.hasOwnProperty.call(data, "lastDailyDigestSentAt")) {
      setting.lastDailyDigestSentAt = nextSentAt ?? null;
    }

    return { count: 1 };
  });
  const update = vi.fn(async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => {
    const setting = storedSettings.get(where.userId);

    if (!setting) {
      throw new Error(`Missing app settings for ${where.userId}`);
    }

    Object.assign(setting, data);

    return cloneSettings(setting);
  });

  return {
    prismaMock: {
      appSettings: {
        findMany,
        updateMany,
        update,
      },
    },
    findMany,
    updateMany,
    update,
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

  it("sends one digest email and claims the user before sending", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const context = createAppSettingsPrismaMock([createSettings()]);
    routeMocks.setPrismaMock(context.prismaMock);
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
    expect(context.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: "user-1" }),
      data: { lastDailyDigestSentAt: expect.any(Date) },
    });
    expect(context.update).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      sent: 1,
      skipped: 0,
      failed: 0,
    });
  });

  it("skips a stale overlapping invocation after another run claims the user", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const context = createAppSettingsPrismaMock([createSettings()]);
    routeMocks.setPrismaMock(context.prismaMock);
    routeMocks.getDailyDigestItems.mockResolvedValue([
      {
        id: "item-1",
        title: "Priority read",
        sourceUrl: "https://example.com/article",
      },
    ]);
    routeMocks.sendReadingRiverDailyDigestEmail.mockResolvedValue({ id: "email-1" });

    const firstResponse = await GET(authorizedRequest());
    const secondResponse = await GET(authorizedRequest());

    expect(routeMocks.sendReadingRiverDailyDigestEmail).toHaveBeenCalledTimes(1);
    expect(context.updateMany).toHaveBeenCalledTimes(2);
    expect(await firstResponse.json()).toMatchObject({
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toMatchObject({
      sent: 0,
      skipped: 1,
      failed: 0,
    });
  });

  it("surfaces failures while continuing to process later users", async () => {
    vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));

    const context = createAppSettingsPrismaMock([
      createSettings({
        id: "settings-1",
        userId: "user-1",
        user: {
          id: "user-1",
          email: "first@example.com",
          displayName: "First Reader",
        },
      }),
      createSettings({
        id: "settings-2",
        userId: "user-2",
        user: {
          id: "user-2",
          email: "second@example.com",
          displayName: "Second Reader",
        },
      }),
    ]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    routeMocks.setPrismaMock(context.prismaMock);
    routeMocks.getDailyDigestItems.mockImplementation(async ({ userId }) => [
      {
        id: `item-${userId}`,
        title: `Priority read for ${userId}`,
        sourceUrl: `https://example.com/${userId}`,
      },
    ]);
    routeMocks.sendReadingRiverDailyDigestEmail
      .mockRejectedValueOnce(new Error("first user send failed"))
      .mockResolvedValueOnce({ id: "email-2" });

    const response = await GET(authorizedRequest());

    expect(routeMocks.sendReadingRiverDailyDigestEmail).toHaveBeenCalledTimes(2);
    expect(context.updateMany).toHaveBeenCalledTimes(2);
    expect(context.update).toHaveBeenCalledTimes(1);
    expect(context.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { lastDailyDigestSentAt: null },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      sent: 1,
      skipped: 0,
      failed: 1,
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
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
