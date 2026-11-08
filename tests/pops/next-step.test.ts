// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nextStepForTask } from "@/lib/pops/next-step";
import { DEFAULT_PIPELINES } from "@/lib/pops/defaults";

const pipelines = DEFAULT_PIPELINES.filter((p) => p.workspace === "work").map(({ slug, name }) => ({ slug, name }));
const task = {
  status: "active",
  workspace: "work",
  suggestedNextAction: "Hand the Phase B research-only retraining implementation to a coding agent; no production change.",
  runs: [{ pipelineSlug: "work-plan-change", outcome: "completed" }],
  decisions: [{ status: "answered" }, { status: "answered" }],
};

describe("POps guided next action", () => {
  it("offers a one-click Codex handoff after a completed plan, even on an existing task", () => {
    expect(nextStepForTask(task, pipelines)).toMatchObject({
      kind: "pipeline",
      pipelineSlug: "work-implement-change",
      provider: "codex",
      label: "Copy Codex handoff",
      canRecordResult: true,
    });
  });

  it("prioritises an unanswered decision over implementation", () => {
    expect(nextStepForTask({ ...task, decisions: [{ status: "open" }] }, pipelines)).toMatchObject({
      kind: "decision", label: "Go to decision",
    });
  });

  it("moves from recorded implementation to review and then decision, without completing the task", () => {
    expect(nextStepForTask({ ...task, runs: [...task.runs, { pipelineSlug: "work-implement-change", outcome: "completed" }] }, pipelines)?.pipelineSlug)
      .toBe("work-review-implementation");
    expect(nextStepForTask({ ...task, runs: [...task.runs, { pipelineSlug: "work-review-implementation", outcome: "completed" }] }, pipelines)?.pipelineSlug)
      .toBe("work-prepare-decision");
  });

  it("does not recommend an archived/missing implementation template", () => {
    expect(nextStepForTask(task, pipelines.filter((p) => p.slug !== "work-implement-change"))?.pipelineSlug)
      .not.toBe("work-implement-change");
  });

  it("does not offer work while paused or completed", () => {
    expect(nextStepForTask({ ...task, status: "paused" }, pipelines)).toBeNull();
    expect(nextStepForTask({ ...task, status: "completed" }, pipelines)).toBeNull();
  });

  it("resurfaces blockers and provides a default action on new tasks", () => {
    expect(nextStepForTask({ ...task, runs: [{ pipelineSlug: "work-implement-change", outcome: "blocked" }] }, pipelines)?.pipelineSlug)
      .toBe("work-investigate-problem");
    expect(nextStepForTask({ ...task, runs: [] }, pipelines)?.kind).toBe("pipeline");
  });
});
