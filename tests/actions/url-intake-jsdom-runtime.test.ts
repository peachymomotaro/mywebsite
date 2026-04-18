import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialIntakeFormState } from "@/lib/reading-river/intake-form-state";

const createMock = vi.fn();
const findAppSettingsMock = vi.fn();
const findExistingReadingItemMock = vi.fn();
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
      findFirst: findExistingReadingItemMock,
    },
  }),
}));

vi.mock("@/lib/reading-river/current-user", () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

function buildUrlFormData(url = "https://example.com/runtime-failure") {
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

describe("submitUrlIntake jsdom runtime failures", () => {
  beforeEach(() => {
    createMock.mockReset();
    findAppSettingsMock.mockReset();
    findAppSettingsMock.mockResolvedValue(null);
    findExistingReadingItemMock.mockReset();
    findExistingReadingItemMock.mockResolvedValue(null);
    revalidatePathMock.mockReset();
    unstableRethrowMock.mockReset();
    requireCurrentUserMock.mockReset();
    requireCurrentUserMock.mockResolvedValue(createCurrentUser());
    vi.doUnmock("jsdom");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("falls back to a review state when jsdom cannot load in the runtime", async () => {
    const formData = buildUrlFormData("https://example.com/runtime-failure");

    formData.set("title", "");

    vi.doMock("jsdom", () => {
      throw new Error("Failed to load external module jsdom-runtime");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<html><head><title>Runtime failure</title></head><body><article><p>${repeatWords(
            220,
          )}</p></article></body></html>`,
      }),
    );

    const { submitUrlIntake } = await import("@/app/reading-river/actions/ingest-url");

    await expect(submitUrlIntake(initialIntakeFormState, formData)).resolves.toEqual({
      status: "review",
      message:
        "I found the article, but the reading time still needs your confirmation before saving.",
      draftValues: {
        url: "https://example.com/runtime-failure",
        title: "Runtime failure",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
      },
      reviewMetadata: {
        fetchSucceeded: true,
        estimatedMinutesRequired: true,
        extractedTitle: "Runtime failure",
        extractedText: null,
        titleWasPrefilled: true,
        siteName: "example.com",
        author: null,
        wordCount: null,
        estimatedMinutes: null,
        lengthEstimationMethod: "unknown",
        lengthEstimationConfidence: "unknown",
      },
      submittedAt: expect.any(Number),
    });
  });
});
