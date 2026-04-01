import { describe, expect, it } from "vitest";
import { DisplayMode, ReadingStatus } from "@prisma/client";

describe("schema enums", () => {
  it("exposes the expected enums", () => {
    expect(DisplayMode.suggested).toBeDefined();
    expect(ReadingStatus.unread).toBeDefined();
  });
});
