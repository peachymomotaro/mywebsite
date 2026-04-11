import { NextResponse } from "next/server";
import { getDailyDigestItems, isLondonDailyDigestHour } from "@/lib/reading-river/daily-digest";
import { getPrismaClient } from "@/lib/reading-river/db";
import { sendReadingRiverDailyDigestEmail } from "@/lib/reading-river/email";

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

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  if (!isLondonDailyDigestHour(now)) {
    return NextResponse.json({
      skipped: true,
      reason: "outside-window",
    });
  }

  const prisma = getPrismaClient();
  const settings = await prisma.appSettings.findMany({
    where: { dailyDigestEnabled: true },
    include: { user: true },
  });
  const londonDayKey = getLondonDayKey(now);
  let sent = 0;
  let skipped = 0;

  for (const setting of settings) {
    try {
      if (
        setting.lastDailyDigestSentAt &&
        getLondonDayKey(setting.lastDailyDigestSentAt) === londonDayKey
      ) {
        skipped += 1;
        continue;
      }

      const items = await getDailyDigestItems({
        userId: setting.userId,
        now,
      });

      if (items.length === 0) {
        skipped += 1;
        continue;
      }

      await sendReadingRiverDailyDigestEmail({
        email: setting.user.email,
        displayName: setting.user.displayName ?? setting.user.email,
        items,
      });

      await prisma.appSettings.update({
        where: { userId: setting.userId },
        data: {
          lastDailyDigestSentAt: now,
        },
      });

      sent += 1;
    } catch (error) {
      console.error("Failed to process Reading River daily digest user", {
        error,
        userId: setting.userId,
      });
    }
  }

  return NextResponse.json({
    sent,
    skipped,
  });
}
