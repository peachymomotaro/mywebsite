import { randomBytes } from "node:crypto";
import { ZodError } from "zod";
import type { PopsTaskStatus, PopsWorkspace } from "@prisma/client";
import type { AgentPrincipal } from "@/lib/pops/agent-auth";
import { isTaskStatus, isWorkspace, type AgentScope } from "@/lib/pops/constants";
import { loadPromptContext, loadPromptPipeline } from "@/lib/pops/context";
import { createProposal, getCurrentPlaybook, getPipelineStats, listPipelines, rankPipelinesForTask } from "@/lib/pops/library";
import { buildPipelinePrompt, newIdempotencyKey } from "@/lib/pops/prompt";
import { createDecision, recordAgentRun, recordRunFeedback } from "@/lib/pops/runs";
import { createTask, listTasks, PopsConflictError, PopsNotFoundError } from "@/lib/pops/tasks";
import { formatZodError, type AgentRunInput, type CreateDecisionInput, type CreateTaskInput, type ProposalInput } from "@/lib/pops/validation";
import { getPopsDb } from "@/lib/pops/db";

export class PopsForbiddenError extends Error {
  constructor(scope: string) {
    super(`This credential lacks the ${scope} scope.`);
    this.name = "PopsForbiddenError";
  }
}

export function requireScope(principal: AgentPrincipal, scope: AgentScope) {
  if (!principal.scopes.includes(scope)) throw new PopsForbiddenError(scope);
}

export function describeError(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof ZodError) return { status: 400, body: { error: "validation_failed", issues: formatZodError(error) } };
  if (error instanceof PopsNotFoundError) return { status: 404, body: { error: "not_found", message: error.message } };
  if (error instanceof PopsConflictError) return { status: 409, body: { error: "conflict", message: error.message } };
  if (error instanceof PopsForbiddenError) return { status: 403, body: { error: "forbidden", message: error.message } };
  if (error instanceof Error && /required|must|cannot|Choose/.test(error.message)) {
    return { status: 400, body: { error: "invalid_request", message: error.message } };
  }
  console.error("[pops] unexpected error", error);
  return { status: 500, body: { error: "internal_error" } };
}

export function siteBaseUrl() {
  return (process.env.POPS_BASE_URL || "https://petercurry.org").replace(/\/$/, "");
}

export const agentOps = {
  async listTasks(principal: AgentPrincipal, args: { workspace?: string; status?: string; tag?: string }) {
    requireScope(principal, "tasks:read");
    const workspace = args.workspace && isWorkspace(args.workspace) ? (args.workspace as PopsWorkspace) : undefined;
    const statuses: PopsTaskStatus[] = args.status && isTaskStatus(args.status) ? [args.status] : ["active", "paused"];
    const tasks = await listTasks({ workspace, statuses, tag: args.tag });
    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        workspace: t.workspace,
        status: t.status,
        projectTags: t.projectTags,
        parentId: t.parentId,
        suggestedNextAction: t.suggestedNextAction,
        openDecisions: t._count.decisions,
        runs: t._count.runs,
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  },

  async getTask(principal: AgentPrincipal, taskId: string) {
    requireScope(principal, "tasks:read");
    const loaded = await loadPromptContext(taskId);
    if (!loaded) throw new PopsNotFoundError("Task");
    const [pipelines, stats, playbook] = await Promise.all([listPipelines(), getPipelineStats(), getCurrentPlaybook()]);
    const ranked = rankPipelinesForTask(loaded.task, pipelines, stats);
    return {
      task: loaded.context.task,
      previousRuns: loaded.context.priorRuns,
      decisions: loaded.task.decisions.map((d) => ({
        id: d.id,
        question: d.question,
        status: d.status,
        options: d.options,
        recommendation: d.recommendation,
        chosenOption: d.chosenOption,
        response: d.response,
      })),
      notes: loaded.context.notes,
      pipelines: {
        recommended: ranked.recommended.map((p) => ({ slug: p.slug, name: p.name, summary: p.summary })),
        other: ranked.other.map((p) => ({ slug: p.slug, name: p.name, summary: p.summary })),
      },
      playbookVersion: playbook.version,
      url: `${siteBaseUrl()}/pops/tasks/${taskId}`,
    };
  },

  async getPipelinePrompt(principal: AgentPrincipal, taskId: string, pipelineSlug: string) {
    requireScope(principal, "tasks:read");
    const [loaded, pipeline, playbook] = await Promise.all([
      loadPromptContext(taskId),
      loadPromptPipeline(pipelineSlug),
      getCurrentPlaybook(),
    ]);
    if (!loaded) throw new PopsNotFoundError("Task");
    if (!pipeline) throw new PopsNotFoundError("Pipeline");
    const idempotencyKey = newIdempotencyKey(taskId, pipelineSlug, randomBytes(4).toString("hex"));
    return {
      idempotencyKey,
      prompt: buildPipelinePrompt({
        context: loaded.context,
        pipeline,
        playbook,
        idempotencyKey,
        apiBaseUrl: siteBaseUrl(),
        includePipelineReview: false,
      }),
    };
  },

  async createTask(principal: AgentPrincipal, input: CreateTaskInput) {
    requireScope(principal, "tasks:write");
    const { task, duplicate } = await createTask(input, "agent");
    return { task: { id: task.id, title: task.title, workspace: task.workspace, status: task.status }, duplicate, url: `${siteBaseUrl()}/pops/tasks/${task.id}` };
  },

  async recordRun(principal: AgentPrincipal, taskId: string, report: AgentRunInput, channel: "api" | "mcp") {
    requireScope(principal, "runs:write");
    const { run, duplicate } = await recordAgentRun(taskId, report, { channel, credentialId: principal.id });
    return { runId: run.id, duplicate, taskStatusChanged: false, url: `${siteBaseUrl()}/pops/tasks/${taskId}#run-${run.id}` };
  },

  async createDecision(principal: AgentPrincipal, taskId: string, input: CreateDecisionInput) {
    requireScope(principal, "decisions:write");
    const { decision, duplicate } = await createDecision(taskId, input, "agent");
    return { decisionId: decision.id, duplicate };
  },

  async recordFeedback(principal: AgentPrincipal, runId: string, input: { useful: boolean; reason?: string; comments?: string }) {
    requireScope(principal, "feedback:write");
    const feedback = await recordRunFeedback(runId, input, { relayed: true });
    return { feedbackId: feedback.id, relayed: true };
  },

  async propose(principal: AgentPrincipal, input: ProposalInput) {
    requireScope(principal, "proposals:write");
    const { proposal, duplicate } = await createProposal(input);
    return { proposalId: proposal.id, status: proposal.status, duplicate };
  },

  async getPlaybook(principal: AgentPrincipal) {
    requireScope(principal, "tasks:read");
    const playbook = await getCurrentPlaybook();
    return { version: playbook.version, content: playbook.content };
  },

  async listPipelines(principal: AgentPrincipal) {
    requireScope(principal, "tasks:read");
    const pipelines = await listPipelines();
    const versions = await getPopsDb().popsPipelineVersion.findMany({
      where: { OR: pipelines.map((p) => ({ pipelineId: p.id, version: p.currentVersion })) },
    });
    const byPipeline = new Map(versions.map((v) => [v.pipelineId, v]));
    return {
      pipelines: pipelines.map((p) => ({
        slug: p.slug,
        name: p.name,
        workspace: p.workspace,
        summary: p.summary,
        version: p.currentVersion,
        instructions: byPipeline.get(p.id)?.instructions ?? "",
        expectedEvidence: byPipeline.get(p.id)?.expectedEvidence ?? "",
      })),
    };
  },
};
