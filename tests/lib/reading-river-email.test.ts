import { afterEach, describe, expect, it } from "vitest";
import { buildReadingRiverDailyDigestEmail } from "@/lib/reading-river/email";

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
});
