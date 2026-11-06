// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.join(__dirname, "../../prisma/migrations/20261106120000_pops_v1/migration.sql"), "utf8");

describe("POps migration safety", () => {
  it("only creates or alters POps objects", () => {
    const statements = sql.split(";").map((s) => s.trim()).filter((s) => s && !s.startsWith("--"));
    for (const statement of statements) {
      const body = statement.replace(/^--.*$/gm, "").trim();
      if (!body) continue;
      expect(body, body.slice(0, 80)).toMatch(/"?Pops|pops_reject_mutation|^\$\$|^END|^RAISE|^BEGIN|LANGUAGE plpgsql/);
    }
  });

  it("never drops, truncates or deletes anything", () => {
    expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  });

  it("makes history, run records and versions append-only", () => {
    for (const table of ["PopsHistoryEntry", "PopsAgentRun", "PopsPipelineVersion", "PopsPlaybookVersion"]) {
      expect(sql).toContain(`BEFORE UPDATE OR DELETE ON "${table}"`);
    }
  });
});
