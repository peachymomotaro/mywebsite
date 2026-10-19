// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import { EDDIES_FULL_MESSAGE } from "@/lib/reading-river/eddy-state";
import { changeEddyArticle } from "@/app/reading-river/actions/eddies";
import { deleteReadingItem, markAsRead, setReadingStatus, updateReadingItem } from "@/app/reading-river/actions/reading-items";
import { ingestUrl, submitUrlIntake } from "@/app/reading-river/actions/ingest-url";
import type { IntakeFormState } from "@/lib/reading-river/intake-form-state";

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
    context.revalidatePath.mockClear();
    const user = await prisma.user.create({ data: { email: `eddies-${randomUUID()}@example.test`, passwordHash: "test" } });
    context.userId = user.id;
    userIds.push(user.id);
    const other = await prisma.user.create({ data: { email: `eddies-${randomUUID()}@example.test`, passwordHash: "test" } });
    otherUserId = other.id;
    userIds.push(other.id);
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it("adds the first article, then the tenth, and rejects an eleventh", async () => {
    const first = await article();
    await add(first.id);
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
    await fill(9);
    const extra = await article();
    await expect(add(extra.id)).rejects.toThrow(EDDIES_FULL_MESSAGE);
    expect(await getEddyArticles(context.userId)).toHaveLength(10);
    expect((await prisma.readingItem.findUniqueOrThrow({ where: { id: extra.id } })).eddySlot).toBeNull();
  });

  it("allows exactly one of twelve concurrent requests to fill the final slot", async () => {
    await fill(9);
    const candidates = await Promise.all(Array.from({ length: 12 }, () => article()));
    const outcomes = await Promise.allSettled(candidates.map((item) => add(item.id)));
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failures = outcomes.filter((result) => result.status === "rejected");
    expect(failures).toHaveLength(11);
    for (const failure of failures) expect(failure.reason).toEqual(new EddyError(EDDIES_FULL_MESSAGE));
    expect(await getEddyArticles(context.userId)).toHaveLength(10);
  });

  it("makes concurrent repeated adds idempotent even when full", async () => {
    const items = await fill(10);
    const before = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    await Promise.all(Array.from({ length: 8 }, () => add(items[0].id)));
    const after = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    expect(after.eddySlot).toBe(before.eddySlot);
    expect(after.eddyAddedAt).toEqual(before.eddyAddedAt);
    expect(await getEddyArticles(context.userId)).toHaveLength(10);
  });

  it("releases a slot without deleting the article, and permits another addition", async () => {
    const items = await fill(10);
    await remove(items[0].id);
    const removed = await prisma.readingItem.findUniqueOrThrow({ where: { id: items[0].id } });
    expect(removed).toMatchObject({ status: "unread", eddySlot: null, eddyAddedAt: null });
    const next = await article();
    await add(next.id);
    expect(await getEddyArticles(context.userId)).toHaveLength(10);
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
    await fill(10);
    const other = await article({ userId: otherUserId });
    await expect(add(other.id)).rejects.toThrow("That article was not found.");
    await expect(remove(other.id)).rejects.toThrow("That article was not found.");
    await add(other.id, otherUserId);
    expect(await getEddyArticles(otherUserId)).toHaveLength(1);
    expect(await getEddyArticles(context.userId)).toHaveLength(10);
  });

  it("returns an inline capacity error from the same action used on the edit page", async () => {
    await fill(10);
    const item = await article();
    const result = await changeEddyArticle(item.id, "add", { status: "idle" }, new FormData());
    expect(result).toEqual({ status: "error", message: EDDIES_FULL_MESSAGE });
    const [kept] = await getEddyArticles(context.userId);
    await changeEddyArticle(kept.id, "remove", { status: "idle" }, new FormData());
    expect(await changeEddyArticle(item.id, "add", { status: "idle" }, new FormData())).toMatchObject({ status: "success" });
    expect(context.revalidatePath).toHaveBeenCalledWith(`/reading-river/items/${item.id}/edit`);
  });

  it("saves URL intake and membership atomically, rolling back the article and tags at capacity", async () => {
    const input = { url: `https://example.com/${randomUUID()}`, title: "Intake article", addToEddies: true,
      estimatedMinutes: 8, tagNames: ["intake"], lengthEstimationMethod: "manual" as const, lengthEstimationConfidence: "unknown" as const };
    const item = await ingestUrl(input);
    expect(await getEddyArticles(context.userId)).toHaveLength(1);
    expect((await prisma.readingItem.findUniqueOrThrow({ where: { id: item.id } })).eddySlot).not.toBeNull();
    await fill(9);
    const failedUrl = `https://example.com/${randomUUID()}`;
    await expect(ingestUrl({ ...input, url: failedUrl, tagNames: ["rolled-back"] })).rejects.toThrow(EDDIES_FULL_MESSAGE);
    expect(await prisma.readingItem.count({ where: { userId: context.userId, sourceUrl: failedUrl } })).toBe(0);
    expect(await prisma.tag.count({ where: { userId: context.userId, name: "rolled-back" } })).toBe(0);
    expect(await ingestUrl({ ...input, url: failedUrl, addToEddies: false })).toBeTruthy();
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

  it("preserves the reviewed URL draft and allows retrying ordinary intake after a capacity error", async () => {
    await fill(10);
    const url = `https://example.com/${randomUUID()}`;
    const previous: IntakeFormState = { status: "review", draftValues: { url, title: "Reviewed", estimatedMinutes: "8", priorityScore: "5", tagNames: "", notes: "", addToEddies: true },
      reviewMetadata: { fetchSucceeded: false, estimatedMinutesRequired: true, extractedTitle: null, extractedText: null, titleWasPrefilled: false, siteName: null, author: null, wordCount: null, estimatedMinutes: null, lengthEstimationMethod: "manual", lengthEstimationConfidence: "unknown" } };
    const form = new FormData();
    for (const [key, value] of Object.entries(previous.draftValues!)) form.set(key, value === true ? "on" : String(value));
    const result = await submitUrlIntake(previous, form);
    expect(result).toMatchObject({ status: "review", message: EDDIES_FULL_MESSAGE, draftValues: { addToEddies: true } });
    expect(result.reviewMetadata).toEqual(previous.reviewMetadata);
    form.delete("addToEddies");
    expect(await submitUrlIntake(result, form)).toMatchObject({ status: "success" });
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
    for (const slot of [0, 11, -1]) {
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
