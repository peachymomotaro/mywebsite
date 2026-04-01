import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("auth schema", () => {
  it("exposes the beta auth models", () => {
    expect(Prisma.ModelName.User).toBe("User");
    expect(Prisma.ModelName.Invite).toBe("Invite");
    expect(Prisma.ModelName.Session).toBe("Session");
    expect(UserStatus.active).toBe("active");
    expect(UserStatus.deactivated).toBe("deactivated");
  });

  it("adds user ownership to reading records", () => {
    expect(Prisma.ReadingItemScalarFieldEnum.userId).toBe("userId");
    expect(Prisma.BookScalarFieldEnum.userId).toBe("userId");
    expect(Prisma.TagScalarFieldEnum.userId).toBe("userId");
    expect(Prisma.ReadEventScalarFieldEnum.userId).toBe("userId");
    expect(Prisma.AppSettingsScalarFieldEnum.userId).toBe("userId");
  });

  it("keeps read events tied to the owning user", () => {
    expect(schema).toMatch(
      /readingItem\s+ReadingItem\s+@relation\(fields: \[userId, readingItemId\], references: \[userId, id\], onDelete: Cascade\)/,
    );
    expect(schema).toMatch(/@@unique\(\[userId, readingItemId\]\)/);
    expect(schema).toMatch(/@@unique\(\[userId, id\]\)/);
  });

  it("keeps app settings owned by exactly one user", () => {
    expect(schema).toMatch(/userId\s+String\s+@unique/);
    expect(schema).toMatch(
      /user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)/,
    );
  });
});
