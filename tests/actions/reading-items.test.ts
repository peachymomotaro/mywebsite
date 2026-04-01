import { describe, expect, it } from "vitest";
import {
  readingItemMarkAsReadSchema,
  readingItemSchema,
  readingItemSkipSchema,
  readingItemUpdateSchema,
} from "@/lib/reading-river/validators/reading-item";

describe("reading item validation", () => {
  it("accepts a minimal manual item", () => {
    const parsed = readingItemSchema.parse({
      title: "Read later",
      sourceType: "manual",
      priorityScore: 5,
      status: "unread",
    });

    expect(parsed.title).toBe("Read later");
  });

  it("does not inject defaults for omitted fields when updating", () => {
    const parsed = readingItemUpdateSchema.parse({
      id: "item-123",
      title: "Updated title",
    });

    expect(parsed).toEqual({
      id: "item-123",
      title: "Updated title",
    });
  });

  it("accepts a mark-as-read action payload", () => {
    const parsed = readingItemMarkAsReadSchema.parse({
      id: "item-123",
    });

    expect(parsed).toEqual({
      id: "item-123",
    });
  });

  it("accepts a skip action payload", () => {
    const parsed = readingItemSkipSchema.parse({
      id: "item-456",
    });

    expect(parsed).toEqual({
      id: "item-456",
    });
  });
});
