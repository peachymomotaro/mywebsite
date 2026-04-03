import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialIntakeFormState } from "@/lib/reading-river/intake-form-state";

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
    revalidatePathMock.mockReset();
    unstableRethrowMock.mockReset();
    requireCurrentUserMock.mockReset();
    requireCurrentUserMock.mockResolvedValue(createCurrentUser());
    vi.doUnmock("jsdom");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("falls back to manual estimate when jsdom cannot load in the runtime", async () => {
    const formData = buildUrlFormData();

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
      status: "needs_estimate",
      message:
        "I couldn't estimate reading time confidently for that link. Add or adjust your best guess before saving it.",
      draftValues: {
        url: "https://example.com/runtime-failure",
        title: "Essay override",
        notes: "Why this belongs in the stream",
        priorityScore: "7",
        estimatedMinutes: "",
        tagNames: "work, essays",
      },
      submittedAt: expect.any(Number),
    });
  });
});
