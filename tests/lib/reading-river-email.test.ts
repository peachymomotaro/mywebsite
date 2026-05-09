import { afterEach, describe, expect, it } from "vitest";
import {
  buildReadingRiverDailyDigestEmail,
  buildReadingRiverPasswordResetEmail,
} from "@/lib/reading-river/email";

describe("buildReadingRiverDailyDigestEmail", () => {
  const originalBaseUrl = process.env.READING_RIVER_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.READING_RIVER_BASE_URL;
    } else {
      process.env.READING_RIVER_BASE_URL = originalBaseUrl;
    }
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

  it("renders an optional book roulette pick in the daily digest", () => {
    process.env.READING_RIVER_BASE_URL = "https://example.com";

    const message = buildReadingRiverDailyDigestEmail({
      displayName: "River Reader",
      items: [{ id: "item-1", title: "One good article", sourceUrl: null, tags: [] }],
      bookRoulettePick: {
        id: "book-1",
        title: "Small Gods",
        author: "Terry Pratchett",
        notes: "A gentle nudge from the shelf.",
      },
    });

    expect(message.html).toContain("Book Roulette");
    expect(message.html).toContain("Small Gods");
    expect(message.html).toContain("Terry Pratchett");
    expect(message.html).toContain("A gentle nudge from the shelf.");
    expect(message.text).toContain("Book Roulette");
    expect(message.text).toContain("Small Gods");
    expect(message.text).toContain("Terry Pratchett");
    expect(message.text).toContain("A gentle nudge from the shelf.");
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
