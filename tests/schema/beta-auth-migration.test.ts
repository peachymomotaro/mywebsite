import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "prisma/migrations/202604011700_beta_accounts_legacy_owner/migration.sql",
);

describe("beta auth migration", () => {
  it("creates the auth tables and backfills legacy data ownership", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "User"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "Invite"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "Session"');
    expect(migration).toContain("legacy-owner@reading-river.local");
    expect(migration).toContain(
      'ALTER TABLE "ReadingItem" ADD COLUMN IF NOT EXISTS "userId" TEXT',
    );
    expect(migration).toContain('UPDATE "ReadingItem"');
  });
});
