import { getPrismaClient } from "./db";

export type ForestArticle = {
  id: string;
  title: string;
  sourceUrl: string | null;
  siteName: string | null;
  readAt: string;
};

/** Reading events already give each finished article one durable identity. */
export async function getForestArticles(userId: string): Promise<ForestArticle[]> {
  const events = await getPrismaClient().readEvent.findMany({
    where: { userId, readingItem: { sourceType: { notIn: ["manual", "book_chapter"] } } },
    orderBy: [{ readAt: "asc" }, { readingItemId: "asc" }],
    select: {
      readAt: true,
      readingItem: { select: { id: true, title: true, sourceUrl: true, siteName: true } },
    },
  });
  return events.map(({ readingItem, readAt }) => ({ ...readingItem, readAt: readAt.toISOString() }));
}
