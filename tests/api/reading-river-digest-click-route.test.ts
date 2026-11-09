import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), noteDriftOpened: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/reading-river/db", () => ({ getPrismaClient: () => ({ readingItem: { findFirst: mocks.findFirst } }) }));
vi.mock("@/lib/reading-river/drift-store", () => ({ noteDriftOpened: mocks.noteDriftOpened }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { GET, POST } from "@/app/api/reading-river/digest-click/route";
import { createDigestArticleToken } from "@/lib/reading-river/digest-links";

function request(method = "GET", token = createDigestArticleToken("reader-1", "article-1")) {
  return new Request(`https://river.example/api/reading-river/digest-click?token=${token}`, { method });
}

describe("digest article click", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret-for-digest-links");
    vi.stubEnv("READING_RIVER_BASE_URL", "https://river.example");
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue({ id: "article-1", sourceUrl: "https://publisher.example/article" });
    mocks.noteDriftOpened.mockResolvedValue({ drifted: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("serves a browser handoff without saving on GET, so link previews do not add articles", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const doc = document.createElement("div");
    doc.innerHTML = await response.text();
    expect(doc.querySelector("form")?.method).toBe("post");
    expect(doc.querySelector("form")?.getAttribute("action")).toBe(new URL(request().url).pathname + new URL(request().url).search);
    expect(doc.querySelector("script")?.textContent).toContain("submit()");
    expect(doc.querySelector("noscript")?.textContent).toContain("Open article");
    expect(mocks.noteDriftOpened).not.toHaveBeenCalled();
  });

  it("saves to the recipient's Eddies without a session and opens the article", async () => {
    const response = await POST(request("POST"));
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "article-1", userId: "reader-1", user: { status: "active" } },
    }));
    expect(mocks.noteDriftOpened).toHaveBeenCalledWith("reader-1", "article-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reading-river");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://publisher.example/article");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each([GET, POST])("rejects forged links before accessing articles", async (handler) => {
    expect((await handler(request("POST", "forged"))).status).toBe(404);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.noteDriftOpened).not.toHaveBeenCalled();
  });

  it("does not act on a missing article or inactive recipient", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await POST(request("POST"))).status).toBe(404);
    expect(mocks.noteDriftOpened).not.toHaveBeenCalled();
  });

  it.each([null, "   ", "javascript:alert(1)", "data:text/html,bad", "/relative"])("safely falls back for source URL %s", async (sourceUrl) => {
    mocks.findFirst.mockResolvedValue({ id: "article-1", sourceUrl });
    const response = await POST(request("POST"));
    expect(response.headers.get("location")).toBe("https://river.example/reading-river/items/article-1/edit");
  });

  it("still opens the article if saving fails", async () => {
    mocks.noteDriftOpened.mockRejectedValueOnce(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await POST(request("POST"));
      expect(response.headers.get("location")).toBe("https://publisher.example/article");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
