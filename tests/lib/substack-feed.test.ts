import { describe, expect, it } from "vitest";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
  <channel>
    <title><![CDATA[Range Widely]]></title>
    <link>https://davidepstein.substack.com</link>
    <item>
      <title><![CDATA[How To Improve Your Information Diet]]></title>
      <description><![CDATA[Like any diet, it's about choosing what not to consume]]></description>
      <link>https://davidepstein.substack.com/p/how-to-improve-your-information-diet</link>
      <guid isPermaLink="false">https://davidepstein.substack.com/p/how-to-improve-your-information-diet</guid>
      <dc:creator><![CDATA[David Epstein]]></dc:creator>
      <content:encoded><![CDATA[<article><p>Hello world</p><p>This is a useful article.</p></article>]]></content:encoded>
    </item>
  </channel>
</rss>`;

describe("substack feed helpers", () => {
  it("recognizes Substack post URLs and derives the feed URL", async () => {
    const { getSubstackFeedUrl, isSubstackPostUrl } = await import(
      "@/lib/reading-river/substack-feed"
    );

    expect(
      isSubstackPostUrl("https://davidepstein.substack.com/p/how-to-improve-your-information-diet")
    ).toBe(true);
    expect(
      isSubstackPostUrl("https://example.com/posts/not-a-substack-post")
    ).toBe(false);
    expect(
      getSubstackFeedUrl(
        "https://davidepstein.substack.com/p/how-to-improve-your-information-diet?utm_source=substack"
      )
    ).toBe("https://davidepstein.substack.com/feed");
  });

  it("parses feed items with metadata and article HTML", async () => {
    const { parseSubstackFeed } = await import("@/lib/reading-river/substack-feed");

    const feed = await parseSubstackFeed(SAMPLE_FEED);

    expect(feed.siteName).toBe("Range Widely");
    expect(feed.items).toEqual([
      {
        author: "David Epstein",
        contentHtml: "<article><p>Hello world</p><p>This is a useful article.</p></article>",
        description: "Like any diet, it's about choosing what not to consume",
        title: "How To Improve Your Information Diet",
        url: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
      },
    ]);
  });

  it("matches feed items against normalized pasted URLs", async () => {
    const { findMatchingSubstackFeedItem, parseSubstackFeed } = await import(
      "@/lib/reading-river/substack-feed"
    );

    const feed = await parseSubstackFeed(SAMPLE_FEED);
    const item = findMatchingSubstackFeedItem(
      feed,
      "https://davidepstein.substack.com/p/how-to-improve-your-information-diet/?utm_source=substack&utm_medium=email"
    );

    expect(item?.title).toBe("How To Improve Your Information Diet");
  });
});
