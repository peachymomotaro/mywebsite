import { DisplayMode, type AppSettings } from "@prisma/client";
import { DEFAULT_READING_SPEED_WPM } from "@/lib/reading-river/reading-config";
import { getPrismaClient } from "@/lib/reading-river/db";

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
  };

  return candidate.code === "P2002";
}

export function getAppSettingsDefaults(userId: string): Pick<
  AppSettings,
  | "displayMode"
  | "manualOrderActive"
  | "highPriorityThreshold"
  | "shortReadThresholdMinutes"
  | "defaultReadingSpeedWpm"
  | "digestCadence"
  | "lastDigestSentAt"
  | "userId"
> {
  return {
    userId,
    displayMode: DisplayMode.suggested,
    manualOrderActive: false,
    highPriorityThreshold: 7,
    shortReadThresholdMinutes: 25,
    defaultReadingSpeedWpm: DEFAULT_READING_SPEED_WPM,
    digestCadence: "off",
    lastDigestSentAt: null,
  };
}

export async function getOrCreateAppSettings(userId: string) {
  const prisma = getPrismaClient();
  const existingSettings = await prisma.appSettings.findUnique({
    where: { userId },
  });

  if (existingSettings) {
    return existingSettings;
  }

  try {
    return await prisma.appSettings.create({
      data: getAppSettingsDefaults(userId),
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const concurrentSettings = await prisma.appSettings.findUnique({
      where: { userId },
    });

    if (concurrentSettings) {
      return concurrentSettings;
    }

    throw error;
  }
}
