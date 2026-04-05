import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialIntakeFormState } from "@/lib/reading-river/intake-form-state";
import { readingRiverPath } from "@/lib/reading-river/routes";

const createMock = vi.fn();
const findAppSettingsMock = vi.fn();
const revalidatePathMock = vi.fn();
const requireCurrentUserMock = vi.fn();
const unstableRethrowMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: unstableRethrowMock,
}));

vi.mock("@/lib/reading-river/db", () => ({
  getPrismaClient: () => ({
    appSettings: {
      findUnique: findAppSettingsMock,
    },
    readingItem: {
      create: createMock,
    },
  }),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

function buildUrlFormData(
  url = "https://example.com/essay",
  {
    title = "Essay override",
    notes = "Why this belongs in the stream",
    priorityScore = "7",
    estimatedMinutes = "",
    tagNames = "work, essays",
  }: {
    title?: string;
    notes?: string;
    priorityScore?: string;
    estimatedMinutes?: string;
    tagNames?: string;
  } = {},
) {
  const formData = new FormData();

  formData.set("url", url);
  formData.set("title", title);
  formData.set("notes", notes);
  formData.set("priorityScore", priorityScore);
  formData.set("estimatedMinutes", estimatedMinutes);
  formData.set("tagNames", tagNames);

  return formData;
}

function buildReviewState({
  message = "Review the fetched details and save the article when it looks right.",
  draftValues,
  reviewMetadata,
}: {
  message?: string;
  draftValues?: {
    url?: string;
    title?: string;
    notes?: string;
    priorityScore?: string;
    estimatedMinutes?: string;
    tagNames?: string;
  };
  reviewMetadata?: {
    fetchSucceeded?: boolean;
    estimatedMinutesRequired?: boolean;
    extractedTitle?: string | null;
    extractedText?: string | null;
    titleWasPrefilled?: boolean;
    siteName?: string | null;
    author?: string | null;
    wordCount?: number | null;
    estimatedMinutes?: number | null;
    lengthEstimationMethod?:
      | "schema_wordCount"
      | "schema_timeRequired"
      | "schema_articleBody"
      | "readability"
      | "trafilatura"
      | "manual"
      | "unknown";
    lengthEstimationConfidence?: "high" | "medium" | "low" | "unknown";
  } | null;
} = {}) {
  return {
    status: "review" as const,
    message,
    draftValues: {
      url: "https://example.com/essay",
      title: "Essay",
      notes: "Why this belongs in the stream",
      priorityScore: "7",
      estimatedMinutes: "2",
      tagNames: "work, essays",
      ...draftValues,
    },
    reviewMetadata: {
      fetchSucceeded: true,
      estimatedMinutesRequired: false,
      extractedTitle: "Essay",
      extractedText: repeatWords(220),
      titleWasPrefilled: true,
      siteName: "Example",
      author: null,
      wordCount: 220,
      estimatedMinutes: 2,
      lengthEstimationMethod: "readability" as const,
      lengthEstimationConfidence: "medium" as const,
      ...reviewMetadata,
    },
    submittedAt: 1,
  };
}

function repeatWords(count: number) {
  return "word ".repeat(count).trim();
}

function buildSubstackFeed({
  title = "How To Improve Your Information Diet",
  description = "Like any diet, it's about choosing what not to consume",
  author = "David Epstein",
  url = "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
  contentHtml = `<article><p>${repeatWords(220)}</p></article>`,
} = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
  <channel>
    <title><![CDATA[Range Widely]]></title>
    <link>https://davidepstein.substack.com</link>
    <item>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${url}</link>
      <guid isPermaLink="false">${url}</guid>
      <dc:creator><![CDATA[${author}]]></dc:creator>
      <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
    </item>
  </channel>
</rss>`;
}

function createCurrentUser() {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "River Reader",
    passwordHash: "hash",
    status: "active",
    isAdmin: false,
    createdAt: new Date("2026-04-01T12:00:00Z"),
    updatedAt: new Date("2026-04-01T12:00:00Z"),
  };
}

describe("submitUrlIntake", () => {
  beforeEach(() => {
    createMock.mockReset();
    findAppSettingsMock.mockReset();
    findAppSettingsMock.mockResolvedValue(null);
    revalidatePathMock.mockReset();
    unstableRethrowMock.mockReset();
    requireCurrentUserMock.mockReset();
    requireCurrentUserMock.mockResolvedValue(createCurrentUser());
    vi.doUnmock("jsdom");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("normalizes a pasted domain before fetching the page", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData("papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<html><head><title>Essay</title><meta property="og:site_name" content="Example" /></head><body><article><h1>Essay</h1><p>${repeatWords(
          220,
        )}</p></article></body></html>`,
    });

    vi.stubGlobal("fetch", fetchMock);

    await submitUrlIntake(initialIntakeFormState, formData);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231",
      expect.objectContaining({
        headers: {
          "User-Agent": "Reading River/0.1 (+https://reading-river.local)",
        },
      }),
    );
  });

  it("returns a review state without saving when the page cannot be fetched", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("blocked")));

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(result).toEqual({
      status: "review",
      message:
        "I couldn't fetch this page. Review the title and add a reading time before saving it manually.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: false,
        estimatedMinutesRequired: true,
        extractedTitle: null,
        extractedText: null,
        titleWasPrefilled: false,
        siteName: null,
        author: null,
        wordCount: null,
        estimatedMinutes: null,
        lengthEstimationMethod: "unknown",
        lengthEstimationConfidence: "unknown",
      },
      submittedAt: expect.any(Number),
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "Reading time estimation fetch failed.",
      expect.objectContaining({
        url: "https://example.com/essay",
        errorMessage: "blocked",
      }),
    );
  });

  it("returns a handled error state when current-user resolution fails unexpectedly", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    requireCurrentUserMock.mockRejectedValueOnce(new Error("session lookup failed"));

    await expect(submitUrlIntake(initialIntakeFormState, formData)).resolves.toEqual({
      status: "error",
      message: "Couldn't add that link. Try again.",
      submittedAt: expect.any(Number),
    });
    expect(unstableRethrowMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Reading River URL intake failed.",
      expect.objectContaining({
        errorMessage: "session lookup failed",
        url: "https://example.com/essay",
      }),
    );
  });

  it("requires an estimated reading time before saving a manual review", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(
      buildReviewState({
        message:
          "I couldn't fetch this page. Review the title and add a reading time before saving it manually.",
        draftValues: {
          title: "Essay override",
          estimatedMinutes: "",
        },
        reviewMetadata: {
          fetchSucceeded: false,
          estimatedMinutesRequired: true,
          extractedTitle: null,
          extractedText: null,
          titleWasPrefilled: false,
          siteName: null,
          author: null,
          wordCount: null,
          estimatedMinutes: null,
          lengthEstimationMethod: "unknown",
          lengthEstimationConfidence: "unknown",
        },
      }),
      formData,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message: "Add an estimated reading time before saving this article.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: false,
        estimatedMinutesRequired: true,
        extractedTitle: null,
        extractedText: null,
        titleWasPrefilled: false,
        siteName: null,
        author: null,
        wordCount: null,
        estimatedMinutes: null,
        lengthEstimationMethod: "unknown",
        lengthEstimationConfidence: "unknown",
      },
      submittedAt: expect.any(Number),
    });
  });

  it("saves with a manual estimate after a fetch failure review", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(undefined, { estimatedMinutes: "12" });
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    createMock.mockResolvedValue({
      id: "item-2",
      title: "Essay override",
    });

    const result = await submitUrlIntake(
      buildReviewState({
        message:
          "I couldn't fetch this page. Review the title and add a reading time before saving it manually.",
        draftValues: {
          title: "Essay override",
          estimatedMinutes: "",
        },
        reviewMetadata: {
          fetchSucceeded: false,
          estimatedMinutesRequired: true,
          extractedTitle: null,
          extractedText: null,
          titleWasPrefilled: false,
          siteName: null,
          author: null,
          wordCount: null,
          estimatedMinutes: null,
          lengthEstimationMethod: "unknown",
          lengthEstimationConfidence: "unknown",
        },
      }),
      formData,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Essay override",
        sourceType: "url",
        sourceUrl: "https://example.com/essay",
        estimatedMinutes: 12,
        priorityScore: 7,
        lengthEstimationMethod: "manual",
        lengthEstimationConfidence: "unknown",
        siteName: null,
        author: null,
        wordCount: null,
      }),
    });
    expect(result).toEqual({
      status: "success",
      message: 'Added "Essay override" to the stream.',
      savedTitle: "Essay override",
      submittedAt: expect.any(Number),
    });
  });

  it("returns a review state with the fetched title and estimate instead of saving immediately", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(undefined, { title: "" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><title>Essay</title><meta property="og:site_name" content="Example" /></head><body><article><h1>Essay</h1><p>${repeatWords(
            220,
          )}</p></article></body></html>`,
      }),
    );

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message: "Fetched article details. Review the title and reading time, then save it.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "2",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: false,
        extractedTitle: "Essay",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "Example",
        author: null,
        wordCount: 220,
        estimatedMinutes: 2,
        lengthEstimationMethod: "readability",
        lengthEstimationConfidence: "medium",
      },
      submittedAt: expect.any(Number),
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("saves the reviewed article without fetching again and preserves extracted metadata", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(undefined, {
      title: "",
      estimatedMinutes: "2",
    });
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    createMock.mockResolvedValue({
      id: "item-1",
      title: "Essay",
    });

    const result = await submitUrlIntake(buildReviewState({ draftValues: { title: "" } }), formData);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Essay",
        sourceType: "url",
        sourceUrl: "https://example.com/essay",
        notes: "Why this belongs in the stream",
        priorityScore: 7,
        estimatedMinutes: 2,
        siteName: "Example",
        extractedText: expect.any(String),
        wordCount: 220,
        lengthEstimationMethod: "readability",
        lengthEstimationConfidence: "medium",
      }),
    });
    expect(createMock.mock.calls[0]?.[0].data.tags.create).toEqual([
      {
        tag: {
          connectOrCreate: {
            where: {
              userId_name: {
                userId: "user-1",
                name: "work",
              },
            },
            create: {
              userId: "user-1",
              name: "work",
            },
          },
        },
      },
      {
        tag: {
          connectOrCreate: {
            where: {
              userId_name: {
                userId: "user-1",
                name: "essays",
              },
            },
            create: {
              userId: "user-1",
              name: "essays",
            },
          },
        },
      },
    ]);
    expect(result).toEqual({
      status: "success",
      message: 'Added "Essay" to the stream.',
      savedTitle: "Essay",
      submittedAt: expect.any(Number),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(readingRiverPath());
  });

  it("refetches article details when the URL changes during review instead of saving stale metadata", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData("https://example.com/updated", {
      title: "Essay",
      estimatedMinutes: "2",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<html><head><title>Updated essay</title><meta property="og:site_name" content="Example" /></head><body><article><h1>Updated essay</h1><p>${repeatWords(
          220,
        )}</p></article></body></html>`,
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(buildReviewState(), formData);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/updated",
      expect.objectContaining({
        headers: {
          "User-Agent": "Reading River/0.1 (+https://reading-river.local)",
        },
      }),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message: "Fetched article details. Review the title and reading time, then save it.",
      draftValues: {
        url: "https://example.com/updated",
        title: "Updated essay",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "2",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: false,
        extractedTitle: "Updated essay",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "Example",
        author: null,
        wordCount: 220,
        estimatedMinutes: 2,
        lengthEstimationMethod: "readability",
        lengthEstimationConfidence: "medium",
      },
      submittedAt: expect.any(Number),
    });
  });

  it("returns a review state with a rough suggestion when the estimate is low confidence", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(undefined, { title: "" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><title>Short note</title><script type="application/ld+json">${JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "Article",
              articleBody: repeatWords(20),
            },
          )}</script></head><body></body></html>`,
      }),
    );

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(result).toEqual({
      status: "review",
      message:
        "I found the article, but the reading time still needs your confirmation before saving.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Short note",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "1",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: true,
        extractedTitle: "Short note",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "example.com",
        author: null,
        wordCount: 20,
        estimatedMinutes: 1,
        lengthEstimationMethod: "schema_articleBody",
        lengthEstimationConfidence: "low",
      },
      submittedAt: expect.any(Number),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("saves a low-confidence review with a manual estimate while keeping extracted metadata", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(undefined, {
      title: "Short note",
      estimatedMinutes: "12",
    });
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    createMock.mockResolvedValue({
      id: "item-2",
      title: "Short note",
    });

    const result = await submitUrlIntake(
      buildReviewState({
        message:
          "I found the article, but the reading time still needs your confirmation before saving.",
        draftValues: {
          title: "Short note",
          estimatedMinutes: "1",
        },
        reviewMetadata: {
          fetchSucceeded: true,
          estimatedMinutesRequired: true,
          extractedTitle: "Short note",
          extractedText: expect.any(String),
          titleWasPrefilled: false,
          siteName: "example.com",
          author: null,
          wordCount: 20,
          estimatedMinutes: 1,
          lengthEstimationMethod: "schema_articleBody",
          lengthEstimationConfidence: "low",
        },
      }),
      formData,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Short note",
        estimatedMinutes: 12,
        siteName: "example.com",
        author: null,
        extractedText: expect.any(String),
        wordCount: 20,
        lengthEstimationMethod: "manual",
        lengthEstimationConfidence: "unknown",
      }),
    });
    expect(result).toEqual({
      status: "success",
      message: 'Added "Short note" to the stream.',
      savedTitle: "Short note",
      submittedAt: expect.any(Number),
    });
  });

  it("logs when a fetched page does not produce readable text", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><head><title>Empty</title></head><body></body></html>",
      }),
    );

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(result.status).toBe("review");
    expect(result.reviewMetadata?.estimatedMinutesRequired).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      "Reading time estimation needs manual confirmation.",
      expect.objectContaining({
        url: "https://example.com/essay",
        confidence: "unknown",
        method: "unknown",
      }),
    );
  });

  it("falls back to the Substack publication feed after a page-fetch failure and prefills the title", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(
      "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
      { title: "" },
    );
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => buildSubstackFeed(),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://davidepstein.substack.com/feed",
      expect.objectContaining({
        headers: {
          "User-Agent": "Reading River/0.1 (+https://reading-river.local)",
        },
      }),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message: "Fetched article details. Review the title and reading time, then save it.",
      draftValues: {
        url: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
        title: "How To Improve Your Information Diet",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "2",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: false,
        extractedTitle: "How To Improve Your Information Diet",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "Range Widely",
        author: "David Epstein",
        wordCount: 220,
        estimatedMinutes: 2,
        lengthEstimationMethod: "readability",
        lengthEstimationConfidence: "medium",
      },
      submittedAt: expect.any(Number),
    });
  });

  it("tries the Substack feed when direct extraction is low confidence", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(
      "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
      { title: "" },
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<html><head><title>Short note</title></head><body><article><p>${repeatWords(
            20,
          )}</p></article></body></html>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => buildSubstackFeed(),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://davidepstein.substack.com/feed",
      expect.anything(),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message: "Fetched article details. Review the title and reading time, then save it.",
      draftValues: {
        url: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
        title: "How To Improve Your Information Diet",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "2",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: false,
        extractedTitle: "How To Improve Your Information Diet",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "Range Widely",
        author: "David Epstein",
        wordCount: 220,
        estimatedMinutes: 2,
        lengthEstimationMethod: "readability",
        lengthEstimationConfidence: "medium",
      },
      submittedAt: expect.any(Number),
    });
  });

  it("keeps the review flow when the Substack feed is also low confidence", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData(
      "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
      { title: "" },
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<html><head><title>Short note</title><script type="application/ld+json">${JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "Article",
              articleBody: repeatWords(20),
            },
          )}</script></head><body></body></html>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          buildSubstackFeed({
            contentHtml: `<div itemprop="articleBody">${repeatWords(20)}</div>`,
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "review",
      message:
        "I found the article, but the reading time still needs your confirmation before saving.",
      draftValues: {
        url: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
        title: "How To Improve Your Information Diet",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "1",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: true,
        extractedTitle: "How To Improve Your Information Diet",
        extractedText: expect.any(String),
        titleWasPrefilled: true,
        siteName: "Range Widely",
        author: "David Epstein",
        wordCount: 20,
        estimatedMinutes: 1,
        lengthEstimationMethod: "schema_articleBody",
        lengthEstimationConfidence: "low",
      },
      submittedAt: expect.any(Number),
    });
  });
});
