import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuplicateReadingItemUrlError } from "@/lib/reading-river/source-url";

const actionMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

const readingItemMocks = vi.hoisted(() => ({
  updateReadingItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));

vi.mock("@/app/reading-river/actions/reading-items", () => ({
  updateReadingItem: readingItemMocks.updateReadingItem,
}));

import { saveReadingItemEditAction } from "@/app/reading-river/items/[id]/edit/actions";

describe("saveReadingItemEditAction", () => {
  beforeEach(() => {
    actionMocks.redirect.mockClear();
    readingItemMocks.updateReadingItem.mockReset();
  });

  it("updates the reading item and redirects back to the homepage", async () => {
    const formData = new FormData();

    formData.set("id", "item-1");
    formData.set("sourceType", "url");
    formData.set("title", "Updated stream article");
    formData.set("sourceUrl", "https://example.com/updated-stream");
    formData.set("estimatedMinutes", "12");
    formData.set("priorityScore", "none");
    formData.set("tagNames", "focus, policy");

    await expect(saveReadingItemEditAction(formData)).rejects.toThrow("redirect:/reading-river");

    expect(readingItemMocks.updateReadingItem).toHaveBeenCalledWith({
      id: "item-1",
      title: "Updated stream article",
      sourceUrl: "https://example.com/updated-stream",
      estimatedMinutes: 12,
      priorityScore: null,
      tagNames: ["focus", "policy"],
    });
  });

  it("redirects back to the edit page when the URL is already saved", async () => {
    const formData = new FormData();

    formData.set("id", "item-1");
    formData.set("sourceType", "url");
    formData.set("title", "Updated stream article");
    formData.set("sourceUrl", "https://example.com/updated-stream");
    formData.set("estimatedMinutes", "12");
    formData.set("priorityScore", "none");
    formData.set("tagNames", "focus, policy");

    readingItemMocks.updateReadingItem.mockRejectedValueOnce(
      new DuplicateReadingItemUrlError("https://example.com/updated-stream", "item-existing"),
    );

    await expect(saveReadingItemEditAction(formData)).rejects.toThrow(
      "redirect:/reading-river/items/item-1/edit?error=duplicate_url",
    );
  });
});
