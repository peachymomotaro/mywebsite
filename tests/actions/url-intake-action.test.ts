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

function buildUrlFormData(url = "https://example.com/essay") {
  const formData = new FormData();

  formData.set("url", url);
  formData.set("title", "Essay override");
  formData.set("notes", "Why this belongs in the stream");
  formData.set("priorityScore", "7");
  formData.set("tagNames", "work, essays");

  return formData;
}

function repeatWords(count: number) {
  return "word ".repeat(count).trim();
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
    createMock.mockResolvedValue({
      id: "item-1",
      title: "Essay override",
    });

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

  it("returns a fetch confirmation state without saving when the page cannot be fetched", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("blocked")));

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(result).toEqual({
      status: "fetch_failed_confirm",
      message:
        "I couldn't fetch this page. It may not exist, or it may block automated access. You can still add it manually if you want to proceed.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
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

  it("asks for a manual estimate after the user proceeds from a fetch failure", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitUrlIntake(
      {
        status: "fetch_failed_confirm",
        message:
          "I couldn't fetch this page. It may not exist, or it may block automated access. You can still add it manually if you want to proceed.",
        draftValues: {
          url: "https://example.com/essay",
          title: "Essay override",
          notes: "Why this belongs in the stream",
          priorityScore: "7",
          estimatedMinutes: "",
          tagNames: "work, essays",
        },
        submittedAt: 1,
      },
      formData,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "needs_estimate",
      message: "Add an estimated reading time before saving this link manually.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
      },
      submittedAt: expect.any(Number),
    });
  });

  it("saves with a manual estimate after the user proceeds from a fetch failure", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();
    const fetchMock = vi.fn();

    formData.set("estimatedMinutes", "12");

    vi.stubGlobal("fetch", fetchMock);
    createMock.mockResolvedValue({
      id: "item-2",
      title: "Essay override",
    });

    const result = await submitUrlIntake(
      {
        status: "fetch_failed_confirm",
        message:
          "I couldn't fetch this page. It may not exist, or it may block automated access. You can still add it manually if you want to proceed.",
        draftValues: {
          url: "https://example.com/essay",
          title: "Essay override",
          notes: "Why this belongs in the stream",
          priorityScore: "7",
          estimatedMinutes: "",
          tagNames: "work, essays",
        },
        submittedAt: 1,
      },
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
      }),
    });
    expect(result).toEqual({
      status: "success",
      message: 'Added "Essay override" to the stream.',
      savedTitle: "Essay override",
      submittedAt: expect.any(Number),
    });
  });

  it("saves the item directly when automatic reading-time extraction succeeds", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();

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
    createMock.mockResolvedValue({
      id: "item-1",
      title: "Essay override",
    });

    const result = await submitUrlIntake(initialIntakeFormState, formData);

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Essay override",
        sourceType: "url",
        sourceUrl: "https://example.com/essay",
        notes: "Why this belongs in the stream",
        priorityScore: 7,
        estimatedMinutes: 2,
        siteName: "Example",
        wordCount: expect.any(Number),
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
      message: 'Added "Essay override" to the stream.',
      savedTitle: "Essay override",
      submittedAt: expect.any(Number),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(readingRiverPath());
  });

  it("returns needs_estimate with a rough suggestion when the estimate is low confidence", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();

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
      status: "needs_estimate",
      message:
        "I couldn't estimate reading time confidently for that link. Add or adjust your best guess before saving it.",
      draftValues: {
        url: "https://example.com/essay",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "1",
        tagNames: "work, essays",
      },
      submittedAt: expect.any(Number),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("saves with a manual estimate when retrying after a failed auto-estimate", async () => {
    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");
    const formData = buildUrlFormData();

    formData.set("estimatedMinutes", "12");

    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    createMock.mockResolvedValue({
      id: "item-2",
      title: "Essay override",
    });

    const result = await submitUrlIntake(
      {
        status: "needs_estimate",
        message: "retry",
        draftValues: {
          url: "https://example.com/essay",
          title: "Essay override",
          notes: "Why this belongs in the stream",
          priorityScore: "7",
          estimatedMinutes: "1",
          tagNames: "work, essays",
        },
        submittedAt: 1,
      },
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
      }),
    });
    expect(result).toEqual({
      status: "success",
      message: 'Added "Essay override" to the stream.',
      savedTitle: "Essay override",
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

    expect(result.status).toBe("needs_estimate");
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
});
