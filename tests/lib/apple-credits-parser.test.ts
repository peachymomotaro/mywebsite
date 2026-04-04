import { describe, expect, it } from "vitest";
import {
  extractCreditLine,
  extractEpisodeLinks,
  extractEpisodeMetadata,
  normalizeText,
} from "@/lib/apple-credits-parser";

describe("apple credits parser", () => {
  it("collects unique episode links from anchors and JSON-LD", () => {
    const html = `
      <html>
        <body>
          <a href="https://podcasts.apple.com/gb/podcast/example/id123?i=100">Episode A</a>
          <script type="application/ld+json">
            {
              "itemListElement": [
                { "url": "https://podcasts.apple.com/gb/podcast/example/id123?i=100" },
                { "item": { "url": "https://podcasts.apple.com/gb/podcast/example/id123?i=200" } }
              ]
            }
          </script>
        </body>
      </html>
    `;

    expect(extractEpisodeLinks(html)).toEqual([
      "https://podcasts.apple.com/gb/podcast/example/id123?i=100",
      "https://podcasts.apple.com/gb/podcast/example/id123?i=200",
    ]);
  });

  it("extracts episode metadata from document head and JSON-LD", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="A Fine Episode" />
          <title>Fallback Title</title>
        </head>
        <body>
          <script type="application/ld+json">
            { "datePublished": "2024-01-15" }
          </script>
        </body>
      </html>
    `;

    expect(extractEpisodeMetadata(html)).toEqual({
      title: "A Fine Episode",
      date: "2024-01-15",
    });
  });

  it("normalizes body text and extracts the matching credit line", () => {
    const text = normalizeText("Producer:\u00a0 Peter Curry\n\nwith extra   spacing");

    expect(text).toBe("Producer: Peter Curry with extra spacing");
    expect(extractCreditLine(text)).toBe("Producer: Peter Curry");
  });
});
