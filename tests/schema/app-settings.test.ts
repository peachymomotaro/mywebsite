import { describe, expect, it } from "vitest";
import { DisplayMode, Prisma, ReadingStatus } from "@prisma/client";

describe("schema enums", () => {
  it("exposes the expected enums", () => {
    expect(DisplayMode.suggested).toBeDefined();
    expect(ReadingStatus.unread).toBeDefined();
  });
});

describe("app settings schema", () => {
  it("exposes the expected scalar fields", () => {
    expect(Prisma.AppSettingsScalarFieldEnum.digestCadence).toBe("digestCadence");
    expect(Prisma.AppSettingsScalarFieldEnum.lastDigestSentAt).toBe("lastDigestSentAt");
  });
});
