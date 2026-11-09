/** The next action is derived from completed work, not from a hand-maintained task status. */
export type NextStep = {
  kind: "decision" | "pipeline";
  title: string;
  description: string;
  label: string;
  pipelineSlug?: string;
  provider?: "coding" | "chat";
  canRecordResult: boolean;
};

type NextStepTask = {
  status: string;
  workspace: string;
  suggestedNextAction: string;
  runs: ReadonlyArray<{ pipelineSlug: string | null; outcome: string }>;
  decisions: ReadonlyArray<{ status: string }>;
};

type AvailablePipeline = { slug: string; name: string };

export function nextStepForTask(task: NextStepTask, available: ReadonlyArray<AvailablePipeline>): NextStep | null {
  if (task.status !== "active") return null;

  const pending = task.decisions.filter((decision) => decision.status === "open").length;
  if (pending) {
    return {
      kind: "decision",
      title: pending === 1 ? "Answer the open decision" : `Answer ${pending} open decisions`,
      description: "The next agent needs your answers before proceeding.",
      label: pending === 1 ? "Go to decision" : "Go to decisions",
      canRecordResult: false,
    };
  }

  const exists = (slug: string) => available.some((p) => p.slug === slug);
  const last = task.runs.at(-1);
  const choose = (
    slug: string, title: string, description: string, label: string, provider: "coding" | "chat" = "chat",
    canRecordResult = false,
  ): NextStep | null =>
    exists(slug) ? { kind: "pipeline", title, description, label, pipelineSlug: slug, provider, canRecordResult } : null;

  if (last?.outcome === "completed" && last.pipelineSlug === "work-plan-change") {
    const step = choose(
      "work-implement-change",
      "Implement the planned change",
      task.suggestedNextAction || "The plan is ready. Hand it to a coding agent with all previous work and decisions.",
      "Copy agent handoff",
      "coding",
      true,
    );
    if (step) return step;
  }

  if (last?.outcome === "completed" && last.pipelineSlug === "work-implement-change") {
    const step = choose(
      "work-review-implementation",
      "Review the implementation",
      "Inspect the draft PR against the plan, your decisions and the test results.",
      "Prepare review prompt",
    );
    if (step) return step;
  }

  if (last?.outcome === "completed" && last.pipelineSlug === "work-review-implementation") {
    const step = choose(
      "work-prepare-decision",
      "Decide what happens next",
      "Review the evidence before requesting any rollout or closing the task.",
      "Prepare a decision",
    );
    if (step) return step;
  }

  if (last && ["blocked", "failed"].includes(last.outcome) && task.workspace === "work") {
    const step = choose(
      "work-investigate-problem",
      "Resolve the blocker",
      task.suggestedNextAction || "Investigate what prevented the last run from finishing.",
      "Investigate blocker",
    );
    if (step) return step;
  }

  const first = available[0];
  return first
    ? {
      kind: "pipeline",
      title: first.name,
      description: task.suggestedNextAction || "Use this pipeline to advance the task.",
      label: "Prepare next handoff",
      pipelineSlug: first.slug,
      provider: "chat",
      canRecordResult: false,
    }
    : null;
}
