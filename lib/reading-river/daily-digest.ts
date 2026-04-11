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
