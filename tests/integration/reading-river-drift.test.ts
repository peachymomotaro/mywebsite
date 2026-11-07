// Runs only against a local, disposable database:
//   DRIFT_TEST_DATABASE_URL=postgresql://postgres:pond@127.0.0.1:55432/drift_dev npm test -- tests/integration/reading-river-drift.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DRIFT_TEST_DATABASE_URL;
const isLocal = url ? ["127.0.0.1", "localhost"].includes(new URL(url).hostname) : false;
const day = (n: number, hour = 10) => new Date(Date.UTC(2026, 10, 4 + n, hour));

describe.skipIf(!isLocal)("river drift against PostgreSQL", () => {
  let store: typeof import("@/lib/reading-river/drift-store");
  let prisma: ReturnType<typeof import("@/lib/reading-river/db").getPrismaClient>;
  const userIds: string[] = [];

  async function userWith(count: number) {
    const user = await prisma.user.create({
      data: { email: `drift-${Date.now()}-${Math.random()}@drift.test`, passwordHash: "disabled" },
    });
    userIds.push(user.id);
    for (let index = 0; index < count; index += 1) {
      await prisma.readingItem.create({
        data: {
          userId: user.id, title: `Piece ${index}`, sourceType: "url", sourceUrl: `https://example.com/${user.id}/${index}`,
          estimatedMinutes: 10, priorityScore: null, createdAt: day(-20),
        },
      });
    }
    return user.id;
  }

  const afloat = async (userId: string, now: Date) => (await store.getDriftViews(userId, { now })).any.afloat.map((item) => item.id);

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATABASE_SSL_NO_VERIFY = "0";
    store = await import("@/lib/reading-river/drift-store");
    prisma = (await import("@/lib/reading-river/db")).getPrismaClient();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("keeps the same stream afloat on reloads within a day", async () => {
    const userId = await userWith(20);
    const first = await afloat(userId, day(0, 9));
    expect(first).toHaveLength(16);
    expect(await afloat(userId, day(0, 18))).toEqual(first);
  });

  it("keeps an opened piece on the bank the next day, out of the water", async () => {
    const userId = await userWith(8);
    const [opened] = await afloat(userId, day(0));
    await store.noteDriftOpened(userId, opened, day(0, 11));

    const tomorrow = await afloat(userId, day(1));
    expect(tomorrow).not.toContain(opened);
    const bank = await store.getRiverBank(userId, tomorrow, day(1));
    expect(bank.stillReading.map((item) => item.id)).toEqual([opened]);

    await store.putBackInRiver(userId, opened);
    expect((await store.getRiverBank(userId, [], day(1))).stillReading).toEqual([]);
  });

  it("lists seen pieces that drifted past, so yesterday's can still be found", async () => {
    const userId = await userWith(8);
    const today = await afloat(userId, day(0));
    await store.noteDriftSeen(userId, "any", today.slice(0, 2), day(0, 11));
    await afloat(userId, day(1));
    const passed = (await store.getRiverBank(userId, [], day(1))).recentlyPassed.map((item) => item.id);
    expect(passed.sort()).toEqual(today.slice(0, 2).sort());
  });

  it("snoozes after two seen, unread days; unseen days and reloads don't count", async () => {
    const userId = await userWith(3); // Small collection: the same three every day.
    const ids = await afloat(userId, day(0));
    await store.noteDriftSeen(userId, "any", ids, day(0, 11));
    await store.noteDriftSeen(userId, "any", ids, day(0, 12)); // Same day again: no extra count.
    await afloat(userId, day(1)); // Settles day 0: one miss each.
    // Day 1 drawn but never looked at; day 2 settles nothing for day 1.
    await afloat(userId, day(2));
    let rows = await prisma.readingItem.findMany({ where: { userId } });
    expect(rows.every((row) => row.driftMisses === 1 && row.snoozedUntil === null)).toBe(true);

    await store.noteDriftSeen(userId, "any", ids, day(2, 11));
    await afloat(userId, day(3)); // Second seen day: three-day snooze.
    rows = await prisma.readingItem.findMany({ where: { userId } });
    expect(rows.every((row) => row.snoozeLevel === 1 && row.snoozedUntil?.getTime() === day(6).getTime())).toBe(true);
  });

  it("Not now never counts as an unread appearance and brings in something new", async () => {
    const userId = await userWith(20);
    const first = await afloat(userId, day(0));
    const [leaving] = first;
    await store.noteDriftSeen(userId, "any", [leaving], day(0, 11));
    const next = await store.letDriftOn(userId, "any", { now: day(0, 12), onlyId: leaving });
    const ids = next.afloat.map((item) => item.id);
    expect(ids).not.toContain(leaving);
    expect(ids).toHaveLength(16);
    expect(ids.filter((id) => !first.includes(id))).toHaveLength(1);
    await afloat(userId, day(1));
    const row = await prisma.readingItem.findFirstOrThrow({ where: { userId, id: leaving } });
    expect(row.driftMisses).toBe(0);
  });

  it("says when nothing new is upstream in a small collection", async () => {
    const userId = await userWith(2);
    await afloat(userId, day(0));
    const next = await store.letDriftOn(userId, "any", { now: day(0, 12) });
    expect(next.afloat).toHaveLength(2);
    expect(next.stillWater).toBe(true);
  });
});
