import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

import { getAppSettingsDefaults, getOrCreateAppSettings } from "@/lib/reading-river/settings";

function createPrismaMock() {
  const findUnique = vi.fn();
  const create = vi.fn();
  const upsert = vi.fn();

  return {
    prismaMock: {
      appSettings: {
        findUnique,
        create,
        upsert,
      },
    },
    findUnique,
    create,
    upsert,
  };
}

describe("getOrCreateAppSettings", () => {
  beforeEach(() => {
    mocks.getPrismaClient.mockClear();
  });

  it("returns existing settings without writing", async () => {
    const context = createPrismaMock();
    const existingSettings = {
      id: "settings-1",
      userId: "user-1",
      displayMode: "suggested",
      manualOrderActive: false,
      highPriorityThreshold: 7,
      shortReadThresholdMinutes: 25,
      defaultReadingSpeedWpm: 200,
      digestCadence: "off",
      includeBookRouletteInDigest: false,
      lastDigestSentAt: null,
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    };

    mocks.setPrismaMock(context.prismaMock);
    context.findUnique.mockResolvedValue(existingSettings);

    await expect(getOrCreateAppSettings("user-1")).resolves.toEqual(existingSettings);

    expect(context.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(context.create).not.toHaveBeenCalled();
    expect(context.upsert).not.toHaveBeenCalled();
  });

  it("creates default settings when none exist", async () => {
    const context = createPrismaMock();
    const createdSettings = {
      id: "settings-2",
      ...getAppSettingsDefaults("user-2"),
      createdAt: new Date("2026-04-01T12:00:00Z"),
      updatedAt: new Date("2026-04-01T12:00:00Z"),
    };

    mocks.setPrismaMock(context.prismaMock);
    context.findUnique.mockResolvedValue(null);
    context.create.mockResolvedValue(createdSettings);

    await expect(getOrCreateAppSettings("user-2")).resolves.toEqual(createdSettings);

    expect(context.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-2" },
    });
    expect(context.create).toHaveBeenCalledWith({
      data: getAppSettingsDefaults("user-2"),
    });
    expect(context.upsert).not.toHaveBeenCalled();
  });

  it("returns the expected defaults", () => {
    expect(getAppSettingsDefaults("user-2")).toMatchObject({
      userId: "user-2",
      digestCadence: "off",
      includeBookRouletteInDigest: false,
      lastDigestSentAt: null,
    });
  });
});
