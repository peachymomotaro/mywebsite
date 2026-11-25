// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nextUnmarked } from "@/lib/pops/quiz-player";
import { AGENT_SCOPES } from "@/lib/pops/constants";
import { isQuizMark, quizUploadSchema, summariseMarks } from "@/lib/pops/quiz";

const migration = readFileSync(
  path.join(__dirname, "../../prisma/migrations/20261125160000_pops_quiz_marking/migration.sql"),
  "utf8",
);

const moreMarks = readFileSync(
  path.join(__dirname, "../../prisma/migrations/20261125180000_pops_quiz_more_marks/migration.sql"),
  "utf8",
);

const paper = {
  id: "qll-2026-20261124M",
  circuit: "QLL League",
  title: "League 2026-27, Week 10",
  playedOn: "2026-11-24",
  questions: [
    { position: 1, section: "Round 1", label: "1A", text: "Which river runs through Stoke, Newark and Burton?", answer: "Trent" },
    { position: 2, section: "Round 1", label: "1B", text: "Which organ is affected by cirrhosis?", answer: "Liver" },
  ],
};

describe("quiz marking", () => {
  it("accepts a well-formed upload and fills defaults", () => {
    const parsed = quizUploadSchema.parse({ papers: [paper] });
    expect(parsed.papers[0].setBy).toBe("");
    expect(parsed.papers[0].questions).toHaveLength(2);
  });

  it("rejects duplicate positions, unsafe ids and bad dates", () => {
    const dup = { ...paper, questions: [paper.questions[0], { ...paper.questions[1], position: 1 }] };
    expect(() => quizUploadSchema.parse({ papers: [dup] })).toThrow();
    expect(() => quizUploadSchema.parse({ papers: [{ ...paper, id: "../etc" }] })).toThrow();
    expect(() => quizUploadSchema.parse({ papers: [{ ...paper, playedOn: "24/11/2026" }] })).toThrow();
  });

  it("knows its marks and summarises them", () => {
    expect(isQuizMark("tip_of_tongue")).toBe(true);
    expect(isQuizMark("close")).toBe(true);
    expect(isQuizMark("confidently_wrong")).toBe(true);
    expect(isQuizMark("wrong")).toBe(false);
    expect(summariseMarks([{ mark: "knew" }, { mark: null }, { mark: "knew" }])).toMatchObject({ knew: 2, unmarked: 1 });
  });

  it("moves to the next unmarked question, wrapping round", () => {
    const qs = [{ mark: "knew" as const }, { mark: null }, { mark: "no_idea" as const }, { mark: null }];
    expect(nextUnmarked(qs, 0)).toBe(1);
    expect(nextUnmarked(qs, 2)).toBe(3);
    expect(nextUnmarked([{ mark: null }, { mark: "knew" as const }], 1)).toBe(0);
    expect(nextUnmarked([{ mark: "knew" as const }], 0)).toBe(-1);
  });

  it("adds separate read and write scopes for the quiz API", () => {
    expect(AGENT_SCOPES).toContain("quiz:read");
    expect(AGENT_SCOPES).toContain("quiz:write");
  });

  it("migration only creates new POps quiz objects", () => {
    // "ON UPDATE CASCADE" in the foreign key is fine; an UPDATE statement is not.
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b|^\s*UPDATE\b/im);
    const statements = migration.split(";").map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
    for (const statement of statements) expect(statement).toMatch(/"PopsQuiz/);
  });

  it("second migration only adds the two new marks", () => {
    // Remove comments before splitting: the header comment itself contains a semicolon.
    const statements = moreMarks.replace(/^--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);
    expect(statements).toHaveLength(2);
    for (const statement of statements) expect(statement).toMatch(/^ALTER TYPE "PopsQuizMark" ADD VALUE IF NOT EXISTS '(close|confidently_wrong)'/);
  });
});
