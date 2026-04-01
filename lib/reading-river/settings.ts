import { DisplayMode, type AppSettings } from "@prisma/client";
import { DEFAULT_READING_SPEED_WPM } from "@/lib/reading-river/reading-config";
import { getPrismaClient } from "@/lib/reading-river/db";

export function getAppSettingsDefaults(userId: string): Pick<
  AppSettings,
  | "displayMode"
  | "manualOrderActive"
  | "highPriorityThreshold"
  | "shortReadThresholdMinutes"
  | "defaultReadingSpeedWpm"
  | "userId"
> {
  return {
    userId,
    displayMode: DisplayMode.suggested,
    manualOrderActive: false,
    highPriorityThreshold: 7,
    shortReadThresholdMinutes: 25,
    defaultReadingSpeedWpm: DEFAULT_READING_SPEED_WPM,
  };
}

export async function getOrCreateAppSettings(userId: string) {
  return getPrismaClient().appSettings.upsert({
    where: { userId },
    update: {},
    create: getAppSettingsDefaults(userId),
  });
}
