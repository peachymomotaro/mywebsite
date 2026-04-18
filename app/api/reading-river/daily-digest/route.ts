import { NextResponse } from "next/server";
import {
  getDailyDigestItems,
  isDigestCadenceDue,
  isLondonDailyDigestHour,
} from "@/lib/reading-river/daily-digest";
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

function getLondonDayStart(now: Date) {
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
    throw new Error("Failed to compute London day start.");
  }

  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  });
  const offsetPart = offsetFormatter
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  const offsetMatch = offsetPart?.match(/^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/);

  if (!offsetMatch?.groups) {
    throw new Error("Failed to compute London time zone offset.");
  }

  const sign = offsetMatch.groups.sign === "-" ? -1 : 1;
  const offsetHours = Number(offsetMatch.groups.hours ?? "0");
  const offsetMinutes = Number(offsetMatch.groups.minutes ?? "0");
  const totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes);

  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0) -
      totalOffsetMinutes * 60_000,
  );
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
    where: {
      digestCadence: {
        not: "off",
      },
    },
    include: { user: true },
  });
  const londonDayKey = getLondonDayKey(now);
  const londonDayStart = getLondonDayStart(now);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const setting of settings) {
    let claimed = false;

    try {
      if (
        setting.lastDigestSentAt &&
        getLondonDayKey(setting.lastDigestSentAt) === londonDayKey
      ) {
        skipped += 1;
        continue;
      }

      if (!isDigestCadenceDue(setting.digestCadence, now)) {
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

      const claimResult = await prisma.appSettings.updateMany({
        where: {
          userId: setting.userId,
          digestCadence: setting.digestCadence,
          OR: [
            { lastDigestSentAt: null },
            { lastDigestSentAt: { lt: londonDayStart } },
          ],
        },
        data: {
          lastDigestSentAt: now,
        },
      });

      if (claimResult.count === 0) {
        skipped += 1;
        continue;
      }

      claimed = true;

      await sendReadingRiverDailyDigestEmail({
        email: setting.user.email,
        displayName: setting.user.displayName ?? setting.user.email,
        items,
      });

      sent += 1;
    } catch (error) {
      failed += 1;

      if (claimed) {
        try {
          await prisma.appSettings.update({
            where: { userId: setting.userId },
            data: {
              lastDigestSentAt: setting.lastDigestSentAt,
            },
          });
        } catch (revertError) {
          console.error("Failed to revert Reading River daily digest claim", {
            error: revertError,
            userId: setting.userId,
          });
        }
      }

      console.error("Failed to process Reading River daily digest user", {
        error,
        userId: setting.userId,
      });
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    failed,
  }, {
    status: failed > 0 ? 500 : 200,
  });
}
