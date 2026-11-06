// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parsePastedReport } from "@/lib/pops/report-import";

const report = {
  idempotencyKey: "task1.learn-intro-pair.aa11bb22",
  outcome: "completed",
  attempted: "Find an intro article and video",
  accomplished: "Found both",
};

describe("pasted report import", () => {
  it("reads a fenced pops-report block out of a full ChatGPT reply", () => {
    const text = `Here is what I found...\n\n\`\`\`pops-report\n${JSON.stringify({ taskId: "task1", report })}\n\`\`\`\nGood luck!`;
    expect(parsePastedReport(text)).toEqual({ ok: true, taskId: "task1", report });
  });

  it("accepts bare report JSON and json-fenced blocks", () => {
    expect(parsePastedReport(JSON.stringify(report))).toMatchObject({ ok: true, taskId: null });
    expect(parsePastedReport("```json\n" + JSON.stringify(report) + "\n```")).toMatchObject({ ok: true });
  });

  it("explains malformed reports field by field", () => {
    const result = parsePastedReport(JSON.stringify({ ...report, outcome: "done", idempotencyKey: "x" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.issues?.map((i) => i.path);
      expect(paths).toContain("outcome");
      expect(paths).toContain("idempotencyKey");
    }
  });

  it("rejects non-JSON and empty pastes", () => {
    expect(parsePastedReport("")).toMatchObject({ ok: false });
    expect(parsePastedReport("I could not finish the task.")).toMatchObject({ ok: false });
  });

  it("rejects unsafe link schemes in sources", () => {
    const result = parsePastedReport(JSON.stringify({ ...report, sources: [{ title: "x", url: "javascript:alert(1)" }] }));
    expect(result.ok).toBe(false);
  });
});
