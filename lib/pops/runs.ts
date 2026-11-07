import { createHash } from "node:crypto";
import { Prisma, type PopsActor, type PopsSubmissionChannel } from "@prisma/client";
import { getPopsDb } from "@/lib/pops/db";
import { appendHistory, PopsConflictError, PopsNotFoundError, touchHumanEngagement } from "@/lib/pops/tasks";
import {
  agentRunSchema,
  createDecisionSchema,
  feedbackSchema,
  type AgentRunInput,
  type CreateDecisionInput,
} from "@/lib/pops/validation";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashContent(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type RecordOptions = {
  channel: PopsSubmissionChannel;
  credentialId?: string;
  now?: Date;
};

/**
 * Records an agent run. Idempotent on `idempotencyKey`: replaying the same
 * report returns the existing run without new history; reusing a key for
 * different content is a conflict. Never changes the task's status.
 */
export async function recordAgentRun(taskId: string, input: AgentRunInput, options: RecordOptions) {
  const report = agentRunSchema.parse(input);
  const { idempotencyKey, ...content } = report;
  const contentHash = hashContent({ taskId, ...content });
  const now = options.now ?? new Date();
  const db = getPopsDb();

  const replay = async () => {
    const existing = await db.popsAgentRun.findUnique({ where: { idempotencyKey } });
    if (!existing) return null;
    if (existing.taskId !== taskId || existing.contentHash !== contentHash) {
      throw new PopsConflictError("This idempotencyKey was already used for a different report.");
    }
    return { run: existing, duplicate: true as const };
  };

  const earlier = await replay();
  if (earlier) return earlier;

  try {
    return await db.$transaction(async (tx) => {
      const task = await tx.popsTask.findUnique({ where: { id: taskId } });
      if (!task) throw new PopsNotFoundError("Task");

      const pipeline = report.pipeline
        ? await tx.popsPipeline.findUnique({ where: { slug: report.pipeline } })
        : null;

      const run = await tx.popsAgentRun.create({
        data: {
          taskId,
          idempotencyKey,
          contentHash,
          channel: options.channel,
          credentialId: options.credentialId,
          pipelineSlug: pipeline?.slug ?? null,
          pipelineVersion: pipeline ? (report.pipelineVersion ?? pipeline.currentVersion) : null,
          agentName: report.agentName,
          outcome: report.outcome,
          attempted: report.attempted,
          accomplished: report.accomplished,
          sources: report.sources,
          artefacts: report.artefacts,
          uncertainties: report.uncertainties,
          blockers: report.blockers,
          nextActions: report.nextActions,
          pipelineReview: report.pipelineReview,
          createdAt: now,
        },
      });

      await appendHistory(tx, {
        taskId,
        kind: "agent_run",
        actor: "agent",
        summary: `${pipeline?.name ?? report.pipeline ?? "Agent run"} — ${report.outcome}: ${report.accomplished.split("\n")[0]}`,
        runId: run.id,
        dedupeKey: `run:${idempotencyKey}`,
        createdAt: now,
      });

      for (const [index, decision] of report.decisions.entries()) {
        await insertDecision(tx, taskId, decision, "agent", now, `${idempotencyKey}:decision:${index}`, run.id);
      }

      for (const [index, proposal] of report.proposals.entries()) {
        const target = proposal.pipelineSlug
          ? await tx.popsPipeline.findUnique({ where: { slug: proposal.pipelineSlug } })
          : pipeline;
        await tx.popsProposal.createMany({
          data: [
            {
              kind: proposal.kind,
              pipelineId: proposal.kind === "pipeline_change" ? target?.id : undefined,
              taskId,
              runId: run.id,
              title: proposal.title,
              body: proposal.body,
              rationale: proposal.rationale,
              dedupeKey: `${idempotencyKey}:proposal:${index}`,
              createdAt: now,
            },
          ],
          skipDuplicates: true,
        });
      }

      if (report.suggestedNextAction?.trim()) {
        // Only the advisory field. Status, completion and engagement are untouched.
        await tx.popsTask.update({ where: { id: taskId }, data: { suggestedNextAction: report.suggestedNextAction.trim() } });
      }

      return { run, duplicate: false as const };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await replay();
      if (raced) return raced;
    }
    throw error;
  }
}

async function insertDecision(
  tx: Prisma.TransactionClient,
  taskId: string,
  input: Omit<CreateDecisionInput, "idempotencyKey">,
  actor: PopsActor,
  now: Date,
  dedupeKey?: string,
  runId?: string,
) {
  const data = createDecisionSchema.parse(input);
  if (dedupeKey) {
    const existing = await tx.popsDecision.findUnique({ where: { dedupeKey } });
    if (existing) return { decision: existing, duplicate: true };
  }
  const decision = await tx.popsDecision.create({
    data: {
      taskId,
      runId,
      question: data.question,
      recommendation: data.recommendation,
      options: data.options,
      explanation: data.explanation,
      evidence: data.evidence,
      raisedBy: actor,
      dedupeKey,
      createdAt: now,
    },
  });
  await appendHistory(tx, {
    taskId,
    kind: "decision_opened",
    actor,
    summary: `Decision needed: ${data.question}`,
    decisionId: decision.id,
    dedupeKey: `decision-opened:${decision.id}`,
    createdAt: now,
  });
  return { decision, duplicate: false };
}

export async function createDecision(taskId: string, input: CreateDecisionInput, actor: PopsActor, now = new Date()) {
  const parsed = createDecisionSchema.parse(input);
  const db = getPopsDb();
  try {
    return await db.$transaction(async (tx) => {
      const task = await tx.popsTask.findUnique({ where: { id: taskId }, select: { id: true } });
      if (!task) throw new PopsNotFoundError("Task");
      const dedupeKey = parsed.idempotencyKey ? `decision:${parsed.idempotencyKey}` : undefined;
      const result = await insertDecision(tx, taskId, parsed, actor, now, dedupeKey);
      if (result.duplicate && result.decision.taskId !== taskId) {
        throw new PopsConflictError("This idempotencyKey belongs to another task.");
      }
      if (actor === "human") await touchHumanEngagement(tx, taskId, now);
      return result;
    });
  } catch (error) {
    if (isUniqueViolation(error) && parsed.idempotencyKey) {
      const existing = await db.popsDecision.findUnique({ where: { dedupeKey: `decision:${parsed.idempotencyKey}` } });
      if (existing) return { decision: existing, duplicate: true };
    }
    throw error;
  }
}

export async function answerDecision(
  decisionId: string,
  answer: { chosenOption?: string; response?: string },
  now = new Date(),
) {
  const chosenOption = (answer.chosenOption ?? "").trim().slice(0, 200);
  const response = (answer.response ?? "").trim().slice(0, 4000);
  if (!chosenOption && !response) throw new Error("Choose an option or write a response.");
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const decision = await tx.popsDecision.findUnique({ where: { id: decisionId } });
    if (!decision) throw new PopsNotFoundError("Decision");
    if (decision.status !== "open") throw new PopsConflictError("This decision has already been closed.");
    const updated = await tx.popsDecision.update({
      where: { id: decisionId },
      data: { status: "answered", chosenOption, response, answeredAt: now },
    });
    await appendHistory(tx, {
      taskId: decision.taskId,
      kind: "decision_answered",
      actor: "human",
      summary: `Decided: ${chosenOption || response.split("\n")[0]}`,
      detail: { question: decision.question, chosenOption, response },
      decisionId,
      dedupeKey: `decision-answered:${decisionId}`,
      createdAt: now,
    });
    await touchHumanEngagement(tx, decision.taskId, now);
    return updated;
  });
}

export async function withdrawDecision(decisionId: string, now = new Date()) {
  const db = getPopsDb();
  await db.$transaction(async (tx) => {
    const decision = await tx.popsDecision.findUnique({ where: { id: decisionId } });
    if (!decision || decision.status !== "open") return;
    await tx.popsDecision.update({ where: { id: decisionId }, data: { status: "withdrawn", answeredAt: now } });
    await appendHistory(tx, {
      taskId: decision.taskId,
      kind: "decision_answered",
      actor: "human",
      summary: `Withdrew decision: ${decision.question}`,
      decisionId,
      dedupeKey: `decision-answered:${decisionId}`,
      createdAt: now,
    });
  });
}

export async function recordRunFeedback(
  runId: string,
  input: { useful: boolean; reason?: string; comments?: string },
  options: { relayed?: boolean; now?: Date } = {},
) {
  const data = feedbackSchema.parse(input);
  const now = options.now ?? new Date();
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const run = await tx.popsAgentRun.findUnique({ where: { id: runId } });
    if (!run) throw new PopsNotFoundError("Run");
    const feedback = await tx.popsRunFeedback.upsert({
      where: { runId },
      create: { runId, ...data, relayed: Boolean(options.relayed) },
      update: { ...data, relayed: Boolean(options.relayed) },
    });
    await appendHistory(tx, {
      taskId: run.taskId,
      kind: "feedback",
      actor: options.relayed ? "agent" : "human",
      summary: `${data.useful ? "Useful" : "Not useful"}${data.reason ? `: ${data.reason}` : ""}`,
      detail: { comments: data.comments },
      runId,
      dedupeKey: `feedback:${runId}:${hashContent(data).slice(0, 16)}`,
      createdAt: now,
    });
    if (!options.relayed) await touchHumanEngagement(tx, run.taskId, now);
    return feedback;
  });
}
