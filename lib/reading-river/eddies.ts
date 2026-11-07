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

export type EddyChange = { id: string; drifted: { id: string; title: string } | null };

/**
 * Adds or removes an article from the eddies. Additions must run inside
 * withEddyTransaction (or another transaction holding the same user lock),
 * including create-and-add intake.
 *
 * The eddies hold five. When a sixth arrives, the one that has been there
 * longest drifts back out into the river: it leaves the eddies and, if it was
 * being read, becomes ordinary unread again so it can come round once more.
 */
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
    // Letting a piece go from the eddies puts it back in the river.
    await tx.readingItem.update({
      where: { userId_id: { userId, id } },
      data: { ...clearedEddyMembership, ...(item.status === "reading" ? { status: "unread" as const, restingUntil: null } : {}) },
      select: { id: true },
    });
    return { id, drifted: null } satisfies EddyChange;
  }

  if (item.sourceType === "manual" || item.sourceType === "book_chapter" ||
      !["unread", "reading"].includes(item.status) || item.readEvent) {
    throw new EddyError("Only unread or in-progress articles can enter the eddies.");
  }
  // Repeated additions preserve both the slot and the original addition time.
  if (item.eddySlot !== null) return { id, drifted: null } satisfies EddyChange;

  const occupied = await tx.readingItem.findMany({
    where: { userId, eddySlot: { not: null } },
    select: { id: true, title: true, status: true, eddySlot: true },
    orderBy: [{ eddyAddedAt: "asc" }, { id: "asc" }],
  });
  const slots = new Set(occupied.map((entry) => entry.eddySlot));
  let slot = Array.from({ length: EDDY_CAPACITY }, (_, index) => index + 1)
    .find((candidate) => !slots.has(candidate));
  let drifted: EddyChange["drifted"] = null;

  if (slot === undefined) {
    // Full: the longest-kept piece drifts back out into the river.
    const oldest = occupied[0];
    if (!oldest?.eddySlot) throw new EddyError(EDDIES_FULL_MESSAGE);
    await tx.readingItem.update({
      where: { userId_id: { userId, id: oldest.id } },
      data: { ...clearedEddyMembership, ...(oldest.status === "reading" ? { status: "unread" as const, restingUntil: null } : {}) },
      select: { id: true },
    });
    slot = oldest.eddySlot;
    drifted = { id: oldest.id, title: oldest.title };
  }

  await tx.readingItem.update({
    where: { userId_id: { userId, id } },
    data: { eddySlot: slot, eddyAddedAt: new Date() },
    select: { id: true },
  });
  return { id, drifted } satisfies EddyChange;
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
