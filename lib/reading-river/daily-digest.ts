type DigestCadence = "off" | "daily" | "every_other_day" | "weekly" | "monthly" | "seasonal";

import { getHomePageData } from "@/lib/reading-river/homepage-data";

export async function getDailyDigestItems({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  const data = await getHomePageData({ userId, now });

  return [data.priorityRead, data.streamRead].filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
}

export function isLondonDailyDigestHour(now: Date) {
  const londonHour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(now);

  return londonHour === "08";
}

function getLondonDateParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !weekday || !month || !day) {
    throw new Error("Failed to compute London date parts.");
  }

  return {
    year: Number(year),
    weekday,
    month: Number(month),
    day: Number(day),
  };
}

const EVERY_OTHER_DAY_ANCHOR_DAY_NUMBER = Math.floor(Date.UTC(2026, 0, 1) / 86_400_000);

function getLondonDayNumber(date: ReturnType<typeof getLondonDateParts>) {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

export function isDigestCadenceDue(cadence: DigestCadence, now: Date) {
  if (cadence === "off") {
    return false;
  }

  if (cadence === "daily") {
    return true;
  }

  const londonDate = getLondonDateParts(now);

  if (cadence === "every_other_day") {
    return (getLondonDayNumber(londonDate) - EVERY_OTHER_DAY_ANCHOR_DAY_NUMBER) % 2 === 0;
  }

  if (cadence === "weekly") {
    return londonDate.weekday === "Mon";
  }

  if (cadence === "monthly") {
    return londonDate.day === 1;
  }

  return londonDate.day === 1 && [1, 4, 7, 10].includes(londonDate.month);
}
