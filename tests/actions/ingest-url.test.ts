import { describe, expect, it } from "vitest";
import { extractArticleFromHtml } from "@/lib/reading-river/article-extraction";

describe("extractArticleFromHtml", () => {
  it("derives readable text and word count", () => {
    const html =
      "<html><head><title>Essay</title><meta property=\"og:site_name\" content=\"Example\" /></head><body><article><p>Hello world</p><p>This is a test.</p></article></body></html>";

    const result = extractArticleFromHtml("https://example.com/post", html);

    expect(result.title).toBe("Essay");
    expect(result.siteName).toBe("Example");
    expect(result.wordCount).toBe(6);
    expect(result.estimatedMinutes).toBe(1);
  });
});
