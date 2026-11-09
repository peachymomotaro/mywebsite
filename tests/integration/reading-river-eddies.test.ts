// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({ userId: "", revalidatePath: vi.fn() }));
let prisma: PrismaClient;
vi.mock("@/lib/reading-river/db", () => ({ getPrismaClient: () => prisma }));
vi.mock("@/lib/reading-river/current-user", () => ({ requireCurrentUser: async () => ({ id: context.userId }) }));
vi.mock("next/cache", () => ({ revalidatePath: context.revalidatePath }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/lib/reading-river/rate-limit", () => ({
  consumeItemCreateRateLimit: async () => ({ allowed: true }),
  consumeUrlFetchRateLimit: async () => ({ allowed: true }),
  isRateLimitExceededError: () => false,
  RateLimitExceededError: class extends Error {},
}));

import { EddyError, getEddyArticles, setEddyMembership, withEddyTransaction } from "@/lib/reading-river/eddies";
import { EDDY_CAPACITY } from "@/lib/reading-river/eddy-state";
import { noteDriftOpened } from "@/lib/reading-river/drift-store";
import { changeEddyArticle } from "@/app/reading-river/actions/eddies";
import { deleteReadingItem, markAsRead, setReadingStatus, updateReadingItem } from "@/app/reading-river/actions/reading-items";
import { ingestUrl } from "@/app/reading-river/actions/ingest-url";
import { GET as openEmailArticle, POST as keepEmailArticle } from "@/app/api/reading-river/digest-click/route";
import { getDigestArticleUrl } from "@/lib/reading-river/digest-links";

// Opt-in only. Refuse remote/shared databases, even if DATABASE_URL is present.
const testUrl = process.env.EDDIES_TEST_DATABASE_URL;
const userIds: string[] = [];
let otherUserId: string;
const add = (id: string, userId = context.userId) => withEddyTransaction(userId, (tx) => setEddyMembership(tx, userId, id, true));
const remove = (id: string) => withEddyTransaction(context.userId, (tx) => setEddyMembership(tx, context.userId, id, false));
async function article(overrides: Record<string, unknown> = {}) {
  return prisma.readingItem.create({ data: {
    userId: context.userId, title: `Article ${randomUUID()}`, sourceType: "url", status: "unread",
    sourceUrl: `https://example.com/${randomUUID()}`, estimatedMinutes: 12, ...overrides,
  } });
}
async function fill(count: number) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = await article();
    await add(item.id);
    items.push(item);
  }
  return items;
}

describe.skipIf(!testUrl)("eddies on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/eddies_test") {
      throw new Error("EDDIES_TEST_DATABASE_URL must point to localhost/eddies_test.");
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl!, max: 25 }) });
  });
  beforeEach(async () => {
    vi.stubEnv("CRON_SECRET", "eddies-test-digest-secret");
    vi.stubEnv("READING_RIVER_BASE_URL", "https://river.example");
    context.revalidatePath.mockClear();
    const user = await prisma.user.create({ data: { email: `eddies-${randomUUID()}@example.test`, passwordHash: "test" } });
    context.userId = user.id;
    userIds.push(user.id);
    const other = await prisma.user.create({ data: { email: `eddies-${randomUUID()}@example.test`, passwordHash: "test" } });
    otherUserId = other.id;
    userIds.push(other.id);
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it("holds five; a sixth lets the longest-kept piece drift back into the river", async () => {
    expect(EDDY_CAPACITY).toBe(5);
    const [oldest] = await fill(5);
    await prisma.readingItem.update({ where: { id: oldest.id }, data: { status: "reading", eddyAddedAt: new Date("2020-01-01") } });
    const extra = await article();
    const change = await add(extra.id);
    expect(change.drifted).toEqual({ id: oldest.id, title: oldest.title });
    const ids = (await getEddyArticles(context.userId)).map((item) => item.id);
    expect(ids).toHaveLength(5);
    expect(ids[0]).toBe(extra.id);
    expect(ids).not.toContain(oldest.id);
    expect(await prisma.readingItem.findUniqueOrThrow({ where: { id: oldest.id } })).toMatchObject({ status: "unread", eddySlot: null, eddyAddedAt: null });
  });

  it("keeps exactly five when twelve additions arrive at once", async () => {
    await fill(4);
    const candidates = await Promise.all(Array.from({ length: 12 }, () => article()));
    const outcomes = await Promise.allSettled(candidates.map((item) => add(item.id)));
    expect(outcomes.every((result) => result.status === "fulfilled")).toBe(true);
    expect(await getEddyArticles(context.userId)).toHaveLength(5);
    const slots = (await prisma.readingItem.findMany({ where: { userId: context.userId, eddySlot: { not: null } } })).map((item) => item.eddySlot);
    expect(new Set(slots).size).toBe(5);
  });

  it("opening a piece from the river carries it into the eddies", async () => {
    const items = await fill(5);
    const opened = await article();
    const result = await noteDriftOpened(context.userId, opened.id);
    expect(result.drifted?.id).toBe(items[0].id);
    expect(await prisma.readingItem.findUniqueOrThrow({ where: { id: opened.id } })).toMatchObject({ status: "reading" });
    expect((await getEddyArticles(context.userId))[0].id).toBe(opened.id);
  });

  it("opening an email article without a session persists it in Eddies and respects capacity", async () => {
    const [oldest] = await fill(5);
    await prisma.readingItem.update({ where: { id: oldest.id }, data: { eddyAddedAt: new Date("2020-01-01") } });
    const opened = await article();
    const url = getDigestArticleUrl(context.userId, opened.id);
    expect((await openEmailArticle(new Request(url))).status).toBe(200);
    expect((await getEddyArticles(context.userId)).map((item) => item.id)).not.toContain(opened.id);

    const response = await keepEmailArticle(new Request(url, { method: "POST" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(opened.sourceUrl);
    expect(response.headers.has("set-cookie")).toBe(false);
    const saved = await prisma.readingItem.findUniqueOrThrow({ where: { id: opened.id } });
    expect(saved).toMatchObject({ status: "reading", lastOpenedAt: expect.any(Date), eddyAddedAt: expect.any(Date) });
    const ids = (await getEddyArticles(context.userId)).map((item) => item.id);
    expect(ids).toHaveLength(5);
    expect(ids[0]).toBe(opened.id);
    expect(ids).not.toContain(oldest.id);

    await keepEmailArticle(new Request(url, { method: "POST", headers: { cookie: "reading-river-session=another-account" } }));
    const repeated = await prisma.readingItem.findUniqueOrThrow({ where: { id: opened.id } });
    expect(repeated.eddySlot).toBe(saved.eddySlot);
    expect(repeated.eddyAddedAt).toEqual(saved.eddyAddedAt);
    expect(await getEddyArticles(otherUserId)).toHaveLength(0);
  });

  it("email clicks cannot restore finished articles or act for another owner or inactive user", async () => {
    const finished = await article();
    await markAsRead({ id: finished.id });
    const url = getDigestArticleUrl(context.userId, finished.id);
    expect((await keepEmailArticle(new Request(url, { method: "POST" }))).status).toBe(303);
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
    expect(await prisma.readingItem.findUniqueOrThrow({ where: { id: finished.id } })).toMatchObject({ status: "done", eddySlot: null });

    const wrongOwner = getDigestArticleUrl(otherUserId, finished.id);
    expect((await keepEmailArticle(new Request(wrongOwner, { method: "POST" }))).status).toBe(404);
    const unread = await article();
    await prisma.user.update({ where: { id: context.userId }, data: { status: "deactivated" } });
    expect((await keepEmailArticle(new Request(getDigestArticleUrl(context.userId, unread.id), { method: "POST" }))).status).toBe(404);
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
  });

  it("makes concurrent repeated adds idempotent even when full", async () => {
    const items = await fill(5);
    const before = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    await Promise.all(Array.from({ length: 8 }, () => add(items[0].id)));
    const after = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    expect(after.eddySlot).toBe(before.eddySlot);
    expect(after.eddyAddedAt).toEqual(before.eddyAddedAt);
    expect(await getEddyArticles(context.userId)).toHaveLength(5);
  });

  it("releases a slot without deleting the article, and permits another addition", async () => {
    const items = await fill(5);
    await remove(items[0].id);
    const removed = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    expect(removed).toMatchObject({ status: "unread", eddySlot: null, eddyAddedAt: null });
    const next = await article();
    expect((await add(next.id)).drifted).toBeNull();
    expect(await getEddyArticles(context.userId)).toHaveLength(5);
  });

  it("letting a piece go from the eddies puts a half-read piece back in the river", async () => {
    const [item] = await fill(1);
    await prisma.readingItem.update({ where: { id: item.id }, data: { status: "reading" } });
    await remove(item.id);
    expect(await prisma.readingItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ status: "unread", eddySlot: null });
  });

  it("uses the existing read event workflow and releases the slot", async () => {
    const [item] = await fill(1);
    await markAsRead({ id: item.id });
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
    expect(await prisma.readEvent.findUnique({ where: { readingItemId: item.id } })).toMatchObject({ userId: context.userId });
    expect(context.revalidatePath).toHaveBeenCalledWith("/reading-river/history");
    await expect(add(item.id)).rejects.toThrow("Only unread or in-progress articles");
  });

  it("cannot restore membership during a concurrent mark-as-read", async () => {
    const item = await article();
    const outcomes = await Promise.allSettled([add(item.id), markAsRead({ id: item.id })]);
    expect(outcomes[1].status).toBe("fulfilled");
    if (outcomes[0].status === "rejected") {
      expect(outcomes[0].reason).toEqual(new EddyError("Only unread or in-progress articles can enter the eddies."));
    }
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
  });

  it.each(["done", "archived", "not_now"] as const)("clears membership on status %s", async (status) => {
    const [item] = await fill(1);
    await setReadingStatus({ id: item.id, status });
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
    await expect(add(item.id)).rejects.toThrow("Only unread or in-progress articles");
  });

  it("clears membership through general edits and deletion", async () => {
    const [item] = await fill(1);
    await updateReadingItem({ id: item.id, sourceType: "manual" });
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
    const [second] = await fill(1);
    await updateReadingItem({ id: second.id, status: "archived" });
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
    const [third] = await fill(1);
    await deleteReadingItem({ id: third.id });
    expect(await getEddyArticles(context.userId)).toHaveLength(0);
  });

  it.each(["manual", "book_chapter"] as const)("rejects %s entries", async (sourceType) => {
    const item = await article({ sourceType });
    await expect(add(item.id)).rejects.toThrow("Only unread or in-progress articles");
  });

  it("isolates ownership and capacity per user", async () => {
    await fill(5);
    const other = await article({ userId: otherUserId });
    await expect(add(other.id)).rejects.toThrow("That article was not found.");
    await expect(remove(other.id)).rejects.toThrow("That article was not found.");
    await add(other.id, otherUserId);
    expect(await getEddyArticles(otherUserId)).toHaveLength(1);
    expect(await getEddyArticles(context.userId)).toHaveLength(5);
  });

  it("says which piece drifted out when adding from the edit page", async () => {
    const [oldest] = await fill(5);
    await prisma.readingItem.update({ where: { id: oldest.id }, data: { eddyAddedAt: new Date("2020-01-01") } });
    const item = await article();
    const result = await changeEddyArticle(item.id, "add", { status: "idle" }, new FormData());
    expect(result).toEqual({ status: "success", message: `Kept in the eddies. "${oldest.title}" drifted back into the river.` });
    expect(context.revalidatePath).toHaveBeenCalledWith(`/reading-river/items/${item.id}/edit`);
  });

  it("saves URL intake and membership together, letting the oldest drift out when full", async () => {
    const input = { url: `https://example.com/${randomUUID()}`, title: "Intake article", addToEddies: true,
      estimatedMinutes: 8, tagNames: ["intake"], lengthEstimationMethod: "manual" as const, lengthEstimationConfidence: "unknown" as const };
    const item = await ingestUrl(input);
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
    expect((await prisma.readingItem.findUniqueOrThrow({ where: { id: item.id } })).eddySlot).not.toBeNull();
    await fill(4);
    await prisma.readingItem.update({ where: { id: item.id }, data: { eddyAddedAt: new Date("2020-01-01") } });
    const later = await ingestUrl({ ...input, url: `https://example.com/${randomUUID()}`, tagNames: ["later"] });
    const ids = (await getEddyArticles(context.userId)).map((entry) => entry.id);
    expect(ids).toHaveLength(5);
    expect(ids[0]).toBe(later.id);
    expect(ids).not.toContain(item.id);
  });

  it("does not duplicate a URL when concurrent intake requests both select the eddies", async () => {
    const input = { url: `https://example.com/${randomUUID()}`, addToEddies: true, estimatedMinutes: 8,
      lengthEstimationMethod: "manual" as const, lengthEstimationConfidence: "unknown" as const };
    const results = await Promise.allSettled([ingestUrl(input), ingestUrl(input)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.readingItem.count({ where: { userId: context.userId, sourceUrl: input.url } })).toBe(1);
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
  });

  it("derives intake ownership from authentication even if an extra user id is submitted", async () => {
    const publicAction = ingestUrl as (...args: unknown[]) => Promise<unknown>;
    await publicAction({ url: `https://example.com/${randomUUID()}`, addToEddies: true, estimatedMinutes: 8,
      lengthEstimationMethod: "manual", lengthEstimationConfidence: "unknown" }, otherUserId);
    expect(await getEddyArticles(otherUserId)).toHaveLength(0);
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
  });

  it("orders by most recent addition, with removal and re-addition moving an article to the top", async () => {
    const [first, second] = await fill(2);
    await prisma.readingItem.update({ where: { id: first.id }, data: { eddyAddedAt: new Date("2020-01-01") } });
    await prisma.readingItem.update({ where: { id: second.id }, data: { eddyAddedAt: new Date("2021-01-01") } });
    expect((await getEddyArticles(context.userId)).map((item) => item.id)).toEqual([second.id, first.id]);
    await remove(first.id);
    await add(first.id);
    expect((await getEddyArticles(context.userId)).map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it("enforces range, uniqueness, paired timestamps and eligibility even for direct database writes", async () => {
    const first = await article();
    const second = await article();
    for (const slot of [0, 6, -1]) {
      await expect(prisma.readingItem.update({ where: { id: first.id }, data: { eddySlot: slot, eddyAddedAt: new Date() } })).rejects.toThrow();
    }
    await expect(prisma.readingItem.update({ where: { id: first.id }, data: { eddySlot: 1 } })).rejects.toThrow();
    await add(first.id);
    const occupied = await prisma.readingItem.findUniqueOrThrow({ where: { id: first.id } });
    await expect(prisma.readingItem.update({ where: { id: second.id }, data: { eddySlot: occupied.eddySlot, eddyAddedAt: new Date() } })).rejects.toThrow();
    await expect(prisma.readingItem.update({ where: { id: first.id }, data: { status: "archived" } })).rejects.toThrow();
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
  });
});
