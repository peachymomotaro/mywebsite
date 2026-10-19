import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/reading-river/db";
import { clearedEddyMembership, EDDY_CAPACITY, EDDIES_FULL_MESSAGE } from "./eddy-state";

export class EddyError extends Error {}

// Lock before any item writes. NO KEY UPDATE serializes allocations for this
// user while remaining compatible with the foreign-key checks on new articles.
// READ COMMITTED gives each query a fresh view after a competing allocator commits.
export function withEddyTransaction<T>(
  userId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return getPrismaClient().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE`;
    return operation(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 });
}

// Additions must run inside withEddyTransaction, including create-and-add intake.
export async function setEddyMembership(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  keep: boolean,
) {
  // Coordinate with status changes, edits, deletion and marking as read so that
  // eligibility cannot become stale between checking and assigning the slot.
  // FOR UPDATE also prevents lock upgrades conflicting with ReadEvent FK checks.
  await tx.$queryRaw`SELECT "id" FROM "ReadingItem" WHERE "userId" = ${userId} AND "id" = ${id} FOR UPDATE`;
  const item = await tx.readingItem.findUnique({
    where: { userId_id: { userId, id } },
    select: { eddySlot: true, sourceType: true, status: true, readEvent: { select: { id: true } } },
  });
  if (!item) throw new EddyError("That article was not found.");

  if (!keep) {
    return tx.readingItem.update({
      where: { userId_id: { userId, id } },
      data: clearedEddyMembership,
      select: { id: true },
    });
  }

  if (item.sourceType === "manual" || item.sourceType === "book_chapter" ||
      !["unread", "reading"].includes(item.status) || item.readEvent) {
    throw new EddyError("Only unread or in-progress articles can enter the eddies.");
  }
  // Repeated additions preserve both the slot and the original addition time.
  if (item.eddySlot !== null) return;

  const occupied = await tx.readingItem.findMany({
    where: { userId, eddySlot: { not: null } },
    select: { eddySlot: true },
    take: EDDY_CAPACITY,
  });
  const slots = new Set(occupied.map((entry) => entry.eddySlot));
  const slot = Array.from({ length: EDDY_CAPACITY }, (_, index) => index + 1)
    .find((candidate) => !slots.has(candidate));
  if (slot === undefined) throw new EddyError(EDDIES_FULL_MESSAGE);

  return tx.readingItem.update({
    where: { userId_id: { userId, id } },
    data: { eddySlot: slot, eddyAddedAt: new Date() },
    select: { id: true },
  });
}

export function getEddyArticles(userId: string) {
  return getPrismaClient().readingItem.findMany({
    where: { userId, eddySlot: { not: null } },
    orderBy: [{ eddyAddedAt: "desc" }, { id: "desc" }],
    take: EDDY_CAPACITY,
    select: { id: true, title: true, sourceUrl: true, siteName: true, estimatedMinutes: true },
  });
}

export type EddyArticle = Awaited<ReturnType<typeof getEddyArticles>>[number];
