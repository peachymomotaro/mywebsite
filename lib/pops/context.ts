import { getPopsDb } from "@/lib/pops/db";
import { getCurrentPlaybook, getPipelineVersion } from "@/lib/pops/library";
import type { PromptContext, PromptPipeline } from "@/lib/pops/prompt";
import { getTaskDetail } from "@/lib/pops/tasks";

type Source = { title: string; url?: string };

function day(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;

export function shapePromptContext(task: TaskDetail): PromptContext {
  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      workspace: task.workspace,
      projectTags: task.projectTags,
      status: task.status,
      suggestedNextAction: task.suggestedNextAction,
      parent: task.parent,
      subtasks: task.subtasks.map((s) => ({ id: s.id, title: s.title, status: s.status })),
      links: [
        ...task.linksFrom.map((l) => ({ id: l.toTask.id, title: l.toTask.title })),
        ...task.linksTo.map((l) => ({ id: l.fromTask.id, title: l.fromTask.title })),
      ],
    },
    priorRuns: task.runs.map((run) => ({
      date: day(run.createdAt),
      pipeline: run.pipelineSlug,
      outcome: run.outcome,
      accomplished: run.accomplished,
      nextActions: (run.nextActions as string[]) ?? [],
      uncertainties: run.uncertainties,
      sources: ((run.sources as Source[]) ?? []).map((s) => ({ title: s.title, url: s.url })),
      feedback: run.feedback ? { useful: run.feedback.useful, reason: run.feedback.reason } : null,
    })),
    decisions: task.decisions.map((d) => ({
      question: d.question,
      status: d.status,
      chosenOption: d.chosenOption,
      response: d.response,
    })),
    notes: task.history
      .filter((h) => h.actor === "human" && (h.kind === "note" || h.kind === "evidence"))
      .map((h) => {
        const detail = (h.detail ?? {}) as { text?: string; url?: string | null };
        return { date: day(h.createdAt), text: detail.text || h.summary, url: detail.url };
      }),
  };
}

export async function loadPromptContext(taskId: string) {
  const task = await getTaskDetail(taskId);
  return task ? { task, context: shapePromptContext(task) } : null;
}

export async function loadPromptPipeline(slug: string, version?: number): Promise<PromptPipeline | null> {
  const found = await getPipelineVersion(slug, version);
  if (!found) return null;
  const criticism = await getPopsDb().popsRunFeedback.findMany({
    where: { useful: false, run: { pipelineSlug: slug }, OR: [{ reason: { not: "" } }, { comments: { not: "" } }] },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { reason: true, comments: true },
  });
  return {
    slug: found.pipeline.slug,
    name: found.pipeline.name,
    version: found.version.version,
    instructions: found.version.instructions,
    expectedEvidence: found.version.expectedEvidence,
    recentCriticism: criticism.map((c) => [c.reason, c.comments].filter(Boolean).join(" — ").slice(0, 300)),
  };
}

export { getCurrentPlaybook };
