import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppSettingsDefaults } from "@/lib/reading-river/settings";

const actionMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const authMocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
}));

const dbMocks = vi.hoisted(() => {
  let prismaMock: any;

  return {
    getPrismaClient: vi.fn(() => prismaMock),
    setPrismaMock(nextPrismaMock: any) {
      prismaMock = nextPrismaMock;
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: authMocks.requireCurrentUser,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: dbMocks.getPrismaClient,
}));

describe("Reading River preferences actions", () => {
  beforeEach(() => {
    actionMocks.revalidatePath.mockReset();
    actionMocks.redirect.mockClear();
    authMocks.requireCurrentUser.mockReset();
    dbMocks.getPrismaClient.mockClear();
  });

  it("upserts the every-other-day digest preference and redirects with saved status", async () => {
    const appSettingsUpsert = vi.fn(async () => ({}));

    dbMocks.setPrismaMock({
      appSettings: {
        upsert: appSettingsUpsert,
      },
    });

    authMocks.requireCurrentUser.mockResolvedValue({
      id: "user-1",
    });

    const { updatePreferencesAction } = await import("@/app/reading-river/preferences/actions");
    const formData = new FormData();

    formData.set("digestCadence", "every_other_day");
    formData.set("includeBookRouletteInDigest", "on");

    await expect(updatePreferencesAction(formData)).rejects.toThrow(
      "redirect:/reading-river/preferences?saved=1",
    );

    expect(appSettingsUpsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: {
        digestCadence: "every_other_day",
        includeBookRouletteInDigest: true,
      },
      create: {
        ...getAppSettingsDefaults("user-1"),
        digestCadence: "every_other_day",
        includeBookRouletteInDigest: true,
      },
    });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/reading-river/preferences");
  });
});
