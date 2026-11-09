import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDigestArticleToken, readDigestArticleToken } from "@/lib/reading-river/digest-links";

describe("digest article links", () => {
  beforeEach(() => vi.stubEnv("CRON_SECRET", "test-secret-for-digest-links"));
  afterEach(() => vi.unstubAllEnvs());

  it("authorizes only the recipient and article signed into the link", () => {
    const token = createDigestArticleToken("reader-1", "article-1");
    expect(readDigestArticleToken(token)).toEqual({ userId: "reader-1", itemId: "article-1" });
    const [payload, signature] = token.split(".");
    const changed = Buffer.from(JSON.stringify({ userId: "reader-2", itemId: "article-1" })).toString("base64url");
    expect(readDigestArticleToken(`${changed}.${signature}`)).toBeNull();
    expect(readDigestArticleToken(`${payload}.${"0".repeat(64)}`)).toBeNull();
  });

  it.each([null, "", "garbage", "a.b.c", "a.ff", "a." + "f".repeat(64)])("rejects malformed token %s", (token) => {
    expect(readDigestArticleToken(token)).toBeNull();
  });

  it("invalidates links when the signing secret changes", () => {
    const token = createDigestArticleToken("reader-1", "article-1");
    vi.stubEnv("CRON_SECRET", "replacement-secret");
    expect(readDigestArticleToken(token)).toBeNull();
  });

  it("requires a configured signing secret", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(() => createDigestArticleToken("reader-1", "article-1")).toThrow("CRON_SECRET");
    expect(readDigestArticleToken("a." + "f".repeat(64))).toBeNull();
  });
});
