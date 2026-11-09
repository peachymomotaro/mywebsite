import { afterEach, describe, expect, it, vi } from "vitest";
import { readDigestArticleToken } from "@/lib/reading-river/digest-links";
import {
  buildReadingRiverDailyDigestEmail,
  buildReadingRiverPasswordResetEmail,
  DIGEST_STILLS,
  getDigestStillUrl,
} from "@/lib/reading-river/email";

describe("buildReadingRiverDailyDigestEmail", () => {
  const originalBaseUrl = process.env.READING_RIVER_BASE_URL;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalBaseUrl === undefined) {
      delete process.env.READING_RIVER_BASE_URL;
    } else {
      process.env.READING_RIVER_BASE_URL = originalBaseUrl;
    }
  });

  it("uses the same recipient-scoped article link in HTML and plain text", () => {
    vi.stubEnv("CRON_SECRET", "test-secret-for-digest-links");
    process.env.READING_RIVER_BASE_URL = "https://example.com";
    const message = buildReadingRiverDailyDigestEmail({
      userId: "reader-1",
      displayName: "River Reader",
      items: [{ id: "article-1", title: "Read this", sourceUrl: "https://publisher.example/article" }],
    });
    const doc = document.createElement("div");
    doc.innerHTML = message.html;
    const article = [...doc.querySelectorAll("a")].find((link) => link.textContent === "Read this")!;
    const url = new URL(article.href);
    expect(url.pathname).toBe("/api/reading-river/digest-click");
    expect(readDigestArticleToken(url.searchParams.get("token"))).toEqual({ userId: "reader-1", itemId: "article-1" });
    expect(message.text).toContain(article.href);
    expect(message.html).not.toContain("https://publisher.example/article");
  });

  it("renders digest content with Reading River links and fallbacks", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [{ id: "item-1", title: "One good article", sourceUrl: null, tags: [] }],
    });

    expect(message.subject).toBe("Your Reading River for today");
    expect(message.html).toContain("One good article");
    expect(message.html).toContain("Reading River");
    expect(message.html).toContain("/reading-river/items/item-1/edit");
    expect(message.text).toContain("/reading-river/items/item-1/edit");
    expect(message.text).toContain("/reading-river");
    const preview = document.createElement("div");
    preview.innerHTML = message.html;
    const links = [...preview.querySelectorAll("a")];
    const riverButton = links.find((link) => link.textContent === "Step into the river");
    expect(riverButton?.getAttribute("href")).toBe("https://example.com/reading-river");
    expect(links.some((link) => link.textContent === "Reading River")).toBe(false);
  });

  it("falls back to the Reading River URL when the source URL is blank", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [{ id: "item-2", title: "Blank source", sourceUrl: "   ", tags: [] }],
    });

    expect(message.html).toContain("/reading-river/items/item-2/edit");
    expect(message.text).toContain("/reading-river/items/item-2/edit");
  });

  it("omits book suggestions even if a caller supplies a legacy book pick", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const legacyInput = {
      displayName: "River Reader",
      items: [{ id: "item-1", title: "One good article", sourceUrl: null, tags: [] }],
      bookRoulettePick: {
        id: "book-1",
        title: "Small Gods",
        author: "Terry Pratchett",
        notes: "A gentle nudge from the shelf.",
      },
    };
    const message = buildReadingRiverDailyDigestEmail(legacyInput);

    expect(message.html).not.toContain("Book Roulette");
    expect(message.html).not.toContain("Small Gods");
    expect(message.html).not.toContain("Terry Pratchett");
    expect(message.html).not.toContain("A gentle nudge from the shelf.");
    expect(message.text).not.toContain("Book Roulette");
    expect(message.text).not.toContain("Small Gods");
    expect(message.text).not.toContain("Terry Pratchett");
    expect(message.text).not.toContain("A gentle nudge from the shelf.");
    expect(message.html.indexOf("One good article")).toBeLessThan(message.html.indexOf("Step into the river"));
    expect(message.text.indexOf("One good article")).toBeLessThan(message.text.indexOf("Step into the river"));
  });

  it("lays a link to the day's article over the painted still", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [{ id: "item-1", title: "One good article", sourceUrl: "https://example.com/a", siteName: "Orion", estimatedMinutes: 8, tags: [] }],
      now: new Date("2026-06-01T07:15:00Z"),
    });

    expect(message.html).toMatch(/background-image: url\('https:\/\/example\.com\/email\/reading-river\/[a-z]+\.jpg'\)/);
    expect(message.html).toMatch(/<v:fill type="frame" src="https:\/\/example\.com\/email\/reading-river\/[a-z]+\.jpg"/);
    expect(message.html).toMatch(/<a href="https:\/\/example\.com\/a"[^>]*>.*One good article.*Orion · 8 min.*<\/a>/);
    expect(message.text).toContain("One good article");
    expect(message.text).toContain("Step into the river: https://example.com/reading-river");
  });

  it("cuts a long title at a word so the picture still shows", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";
    const title = "What the river remembers: notes on slowness, attention and the long work of reading well";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [{ id: "item-1", title, sourceUrl: "https://example.com/a", tags: [] }],
    });

    expect(message.html).toContain("What the river remembers: notes on slowness, attention and the long work…");
    expect(message.text).toContain(title);
  });

  it("links the still down to the river when there's nothing today", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({ displayName: "River Reader", items: [] });

    expect(message.html).toMatch(/<a href="https:\/\/example\.com\/reading-river"[^>]*>.*Walk down to the river/);
  });

  it("shows only one piece, even if given more", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [
        { id: "item-1", title: "The one for today", sourceUrl: "https://example.com/a", tags: [] },
        { id: "item-2", title: "Not today", sourceUrl: "https://example.com/b", tags: [] },
      ],
    });

    expect(message.html).toContain("The one for today");
    expect(message.html).not.toContain("Not today");
    expect(message.text).not.toContain("Not today");
  });

  it("turns to a new still each London day, coming round in order", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const days = Array.from({ length: DIGEST_STILLS.length + 1 }, (_, offset) =>
      getDigestStillUrl(new Date(Date.UTC(2026, 5, 1 + offset, 7, 15))).split("/").pop(),
    );

    expect(new Set(days.slice(0, DIGEST_STILLS.length)).size).toBe(DIGEST_STILLS.length);
    expect(days[DIGEST_STILLS.length]).toBe(days[0]);
    // Late evening in London is still the same day there, even after midnight UTC.
    expect(getDigestStillUrl(new Date("2026-06-01T22:30:00Z"))).toBe(getDigestStillUrl(new Date("2026-06-01T07:15:00Z")));
  });

  it("renders password reset emails with the reset link", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverPasswordResetEmail({
      displayName: "River Reader",
      token: "reset-token",
    });

    expect(message.subject).toBe("Reset your Reading River password");
    expect(message.html).toContain("/reading-river/reset-password/reset-token");
    expect(message.text).toContain("/reading-river/reset-password/reset-token");
    expect(message.text).toContain("River Reader");
  });
});
