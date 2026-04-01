import { describe, expect, it } from "vitest";
import { estimateArticleLengthFromHtml } from "@/lib/reading-river/article-length-estimation";

function repeatWords(count: number) {
  return "word ".repeat(count).trim();
}

describe("estimateArticleLengthFromHtml", () => {
  it("uses structured wordCount when present", () => {
    const html = `
      <html>
        <head>
          <title>Structured count</title>
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"NewsArticle","wordCount":"1234","timeRequired":"PT2M"}
          </script>
        </head>
        <body><article><p>${repeatWords(40)}</p></article></body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/structured-count",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBe(1234);
    expect(result.estimatedMinutes).toBe(7);
    expect(result.method).toBe("schema_wordCount");
    expect(result.confidence).toBe("high");
  });

  it("uses structured timeRequired when no usable wordCount exists", () => {
    const html = `
      <html>
        <head>
          <title>Structured time</title>
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Article","timeRequired":"PT8M"}
          </script>
        </head>
        <body><article><p>${repeatWords(20)}</p></article></body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/structured-time",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBe(1600);
    expect(result.estimatedMinutes).toBe(8);
    expect(result.method).toBe("schema_timeRequired");
    expect(result.confidence).toBe("high");
  });

  it("uses structured articleBody when it is available", () => {
    const html = `
      <html>
        <head>
          <title>Structured body</title>
          <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              articleBody: repeatWords(240),
            })}
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/structured-body",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBe(240);
    expect(result.estimatedMinutes).toBe(2);
    expect(result.method).toBe("schema_articleBody");
    expect(result.confidence).toBe("high");
  });

  it("falls back to Readability for normal article pages", () => {
    const html = `
      <html>
        <head><title>Readable page</title></head>
        <body>
          <article>
            <h1>Readable page</h1>
            <p>${repeatWords(220)}</p>
          </article>
        </body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/readable-page",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBeGreaterThanOrEqual(220);
    expect(result.estimatedMinutes).toBe(2);
    expect(result.method).toBe("readability");
    expect(result.confidence).toBe("medium");
  });

  it("returns unknown when the page does not look like an article", () => {
    const html = `
      <html>
        <head><title>Menu page</title></head>
        <body>
          <nav><a href="/a">A</a><a href="/b">B</a><a href="/c">C</a></nav>
          <footer><p>Contact us</p></footer>
        </body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/menu-page",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBeNull();
    expect(result.estimatedMinutes).toBeNull();
    expect(result.method).toBe("unknown");
    expect(result.confidence).toBe("unknown");
  });

  it("ignores malformed metadata and falls back to extraction", () => {
    const html = `
      <html>
        <head>
          <title>Malformed metadata</title>
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Article","wordCount":"banana","timeRequired":"not-a-duration"}
          </script>
        </head>
        <body>
          <article>
            <h1>Malformed metadata</h1>
            <p>${repeatWords(210)}</p>
          </article>
        </body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/malformed-metadata",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBeGreaterThanOrEqual(210);
    expect(result.estimatedMinutes).toBe(2);
    expect(result.method).toBe("readability");
    expect(result.confidence).toBe("medium");
  });

  it("marks implausibly tiny results as low confidence", () => {
    const html = `
      <html>
        <head>
          <title>Tiny article body</title>
          <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              articleBody: repeatWords(20),
            })}
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/tiny-article-body",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBe(20);
    expect(result.estimatedMinutes).toBe(1);
    expect(result.method).toBe("schema_articleBody");
    expect(result.confidence).toBe("low");
  });

  it("marks implausibly huge results as low confidence", () => {
    const html = `
      <html>
        <head>
          <title>Huge article body</title>
          <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              articleBody: repeatWords(60001),
            })}
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = estimateArticleLengthFromHtml({
      url: "https://example.com/huge-article-body",
      html,
      wordsPerMinute: 200,
    });

    expect(result.wordCount).toBe(60001);
    expect(result.estimatedMinutes).toBe(301);
    expect(result.method).toBe("schema_articleBody");
    expect(result.confidence).toBe("low");
  });
});
