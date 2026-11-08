import type { PopsActor, PopsHistoryKind, PopsTaskStatus, PopsWorkspace, Prisma } from "@prisma/client";
import { RESURFACE_AFTER_DAYS, RESURFACE_LIMIT, SNOOZE_DAYS } from "@/lib/pops/constants";
import { getPopsDb } from "@/lib/pops/db";
import { createTaskSchema, tagListSchema, type CreateTaskInput } from "@/lib/pops/validation";

type Tx = Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;

export class PopsNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "PopsNotFoundError";
  }
}

export class PopsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PopsConflictError";
  }
}

export async function appendHistory(
  tx: Tx,
  entry: {
    taskId: string;
    kind: PopsHistoryKind;
    actor: PopsActor;
    summary: string;
    detail?: Prisma.InputJsonValue;
    runId?: string;
    decisionId?: string;
    dedupeKey?: string;
    createdAt?: Date;
  },
) {
  // ON CONFLICT DO NOTHING on dedupeKey: replays never duplicate history.
  await tx.popsHistoryEntry.createMany({
    data: [{ ...entry, summary: entry.summary.slice(0, 500) }],
    skipDuplicates: true,
  });
}

export async function touchHumanEngagement(tx: Tx, taskId: string, now = new Date()) {
  await tx.popsTask.update({
    where: { id: taskId },
    data: { lastHumanEngagementAt: now, resurfaceAfter: null },
  });
}

export async function createTask(input: CreateTaskInput, actor: PopsActor, now = new Date()) {
  const data = createTaskSchema.parse(input);
  const db = getPopsDb();

  if (data.idempotencyKey) {
    const existing = await db.popsTask.findUnique({ where: { creationKey: data.idempotencyKey } });
    if (existing) return { task: existing, duplicate: true };
  }

  return db.$transaction(async (tx) => {
    if (data.parentId) {
      const parent = await tx.popsTask.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new PopsNotFoundError("Parent task");
    }

    const task = await tx.popsTask.create({
      data: {
        title: data.title,
        description: data.description,
        workspace: data.workspace as PopsWorkspace,
        projectTags: data.projectTags,
        parentId: data.parentId,
        suggestedNextAction: data.suggestedNextAction,
        recommendedPipelines: data.recommendedPipelines,
        createdBy: actor,
        creationKey: data.idempotencyKey,
        lastHumanEngagementAt: now,
        createdAt: now,
      },
    });

    await appendHistory(tx, {
      taskId: task.id,
      kind: "created",
      actor,
      summary: actor === "agent" ? "Created by an agent" : "Created",
      dedupeKey: `created:${task.id}`,
      createdAt: now,
    });

    if (data.parentId) {
      await appendHistory(tx, {
        taskId: data.parentId,
        kind: "subtask_added",
        actor,
        summary: `Subtask added: ${task.title}`,
        detail: { subtaskId: task.id },
        dedupeKey: `subtask:${task.id}`,
        createdAt: now,
      });
    }

    return { task, duplicate: false };
  });
}

export type TaskPatch = {
  title?: string;
  description?: string;
  workspace?: PopsWorkspace;
  projectTags?: string[];
  suggestedNextAction?: string;
  recommendedPipelines?: string[];
};

export async function updateTask(id: string, patch: TaskPatch, now = new Date(), actor: "human" | "agent" = "human", expectedUpdatedAt?: Date) {
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const task = await tx.popsTask.findUnique({ where: { id } });
    if (!task) throw new PopsNotFoundError("Task");
    if (expectedUpdatedAt && task.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new PopsConflictError("Task changed. Read it again before applying your edit.");
    }

    const next: TaskPatch = {};
    if (patch.title !== undefined && patch.title.trim() && patch.title.trim() !== task.title) next.title = patch.title.trim().slice(0, 200);
    if (patch.description !== undefined && patch.description !== task.description) next.description = patch.description.slice(0, 8000);
    if (patch.workspace && patch.workspace !== task.workspace) next.workspace = patch.workspace;
    if (patch.projectTags) {
      const tags = tagListSchema.parse(patch.projectTags);
      if (JSON.stringify(tags) !== JSON.stringify(task.projectTags)) next.projectTags = tags;
    }
    if (patch.suggestedNextAction !== undefined && patch.suggestedNextAction.trim() !== task.suggestedNextAction) {
      next.suggestedNextAction = patch.suggestedNextAction.trim().slice(0, 500);
    }
    if (patch.recommendedPipelines && patch.recommendedPipelines.join(",") !== task.recommendedPipelines.join(",")) {
      next.recommendedPipelines = patch.recommendedPipelines.slice(0, 8);
    }

    const changed = Object.keys(next);
    if (actor === "agent" && !changed.length) return task;
    const data = {
      ...next,
      updatedAt: new Date(Math.max(now.getTime(), task.updatedAt.getTime() + 1)),
      ...(actor === "human" ? { lastHumanEngagementAt: now, resurfaceAfter: null } : {}),
    };
    const applied = await tx.popsTask.updateMany({ where: { id, ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}) }, data });
    if (applied.count !== 1) throw new PopsConflictError("Task changed. Read it again before applying your edit.");
    const updated = await tx.popsTask.findUniqueOrThrow({ where: { id } });

    if (changed.length) {
      await appendHistory(tx, {
        taskId: id,
        kind: "edited",
        actor,
        summary: `Edited ${changed.join(", ")}`,
        detail: { before: Object.fromEntries(changed.map((key) => [key, task[key as keyof typeof task] as Prisma.InputJsonValue])) },
        createdAt: now,
      });
    }
    return updated;
  });
}

/** Status changes are human-only. Agent runs never call this. */
export async function setTaskStatus(id: string, status: PopsTaskStatus, now = new Date()) {
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const task = await tx.popsTask.findUnique({ where: { id } });
    if (!task) throw new PopsNotFoundError("Task");
    if (task.status === status) return task;

    const updated = await tx.popsTask.update({
      where: { id },
      data: {
        status,
        completedAt: status === "completed" ? now : null,
        archivedAt: status === "archived" ? now : null,
        lastHumanEngagementAt: now,
        resurfaceAfter: null,
      },
    });
    await appendHistory(tx, {
      taskId: id,
      kind: "status_changed",
      actor: "human",
      summary: `Status: ${task.status} → ${status}`,
      detail: { from: task.status, to: status },
      createdAt: now,
    });
    return updated;
  });
}

export async function addTaskNote(
  id: string,
  note: { text: string; url?: string; kind?: "note" | "evidence" },
  actor: PopsActor = "human",
  now = new Date(),
) {
  const body = note.text.trim().slice(0, 4000);
  if (!body && !note.url) throw new Error("A note needs text or a link.");
  const db = getPopsDb();
  await db.$transaction(async (tx) => {
    const task = await tx.popsTask.findUnique({ where: { id }, select: { id: true } });
    if (!task) throw new PopsNotFoundError("Task");
    await appendHistory(tx, {
      taskId: id,
      kind: note.kind ?? (note.url ? "evidence" : "note"),
      actor,
      summary: body.split("\n")[0].slice(0, 200) || note.url!,
      detail: { text: body, url: note.url ?? null },
      createdAt: now,
    });
    if (actor === "human") await touchHumanEngagement(tx, id, now);
  });
}

export async function linkTasks(fromTaskId: string, toTaskId: string, note = "", now = new Date()) {
  if (fromTaskId === toTaskId) throw new Error("A task cannot link to itself.");
  const db = getPopsDb();
  await db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.popsTask.findUnique({ where: { id: fromTaskId } }),
      tx.popsTask.findUnique({ where: { id: toTaskId } }),
    ]);
    if (!from || !to) throw new PopsNotFoundError("Task");
    await tx.popsTaskLink.createMany({ data: [{ fromTaskId, toTaskId, note: note.slice(0, 300) }], skipDuplicates: true });
    await appendHistory(tx, {
      taskId: fromTaskId,
      kind: "link_added",
      actor: "human",
      summary: `Linked to ${to.title}`,
      detail: { toTaskId },
      dedupeKey: `link:${fromTaskId}:${toTaskId}`,
      createdAt: now,
    });
    await touchHumanEngagement(tx, fromTaskId, now);
  });
}

export type TaskListFilter = {
  workspace?: PopsWorkspace;
  statuses?: PopsTaskStatus[];
  tag?: string;
  topLevelOnly?: boolean;
};

export async function listTasks(filter: TaskListFilter = {}) {
  const db = getPopsDb();
  return db.popsTask.findMany({
    where: {
      workspace: filter.workspace,
      status: { in: filter.statuses ?? ["active", "paused"] },
      projectTags: filter.tag ? { has: filter.tag } : undefined,
      parentId: filter.topLevelOnly ? null : undefined,
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 300,
    include: {
      _count: {
        select: {
          subtasks: { where: { status: { in: ["active", "paused"] } } },
          decisions: { where: { status: "open" } },
          runs: true,
        },
      },
    },
  });
}

export async function getTaskDetail(id: string) {
  const db = getPopsDb();
  return db.popsTask.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, title: true } },
      subtasks: { orderBy: { createdAt: "asc" } },
      linksFrom: { include: { toTask: { select: { id: true, title: true, workspace: true, status: true } } } },
      linksTo: { include: { fromTask: { select: { id: true, title: true, workspace: true, status: true } } } },
      history: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      runs: { orderBy: { createdAt: "asc" }, include: { feedback: true } },
      decisions: { orderBy: { createdAt: "asc" } },
    },
  });
}

/**
 * Gentle resurfacing: only active/paused top-level tasks whose last human
 * engagement is old and which have not been snoozed. Completed and archived
 * tasks are never returned.
 */
export async function getResurfacingCandidates(now = new Date(), workspace?: PopsWorkspace) {
  const db = getPopsDb();
  const notSnoozed = { OR: [{ resurfaceAfter: null }, { resurfaceAfter: { lte: now } }] };
  return db.popsTask.findMany({
    where: {
      workspace,
      parentId: null,
      AND: [
        notSnoozed,
        {
          OR: [
            { status: "active", lastHumanEngagementAt: { lt: new Date(now.getTime() - RESURFACE_AFTER_DAYS.active * DAY_MS) } },
            { status: "paused", lastHumanEngagementAt: { lt: new Date(now.getTime() - RESURFACE_AFTER_DAYS.paused * DAY_MS) } },
          ],
        },
      ],
    },
    orderBy: { lastHumanEngagementAt: "asc" },
    take: RESURFACE_LIMIT,
  });
}

export async function snoozeTask(id: string, now = new Date(), days = SNOOZE_DAYS) {
  const db = getPopsDb();
  await db.$transaction(async (tx) => {
    await tx.popsTask.update({ where: { id }, data: { resurfaceAfter: new Date(now.getTime() + days * DAY_MS) } });
    await appendHistory(tx, {
      taskId: id,
      kind: "resurfacing",
      actor: "human",
      summary: `Resurfacing snoozed for ${days} days`,
      createdAt: now,
    });
  });
}

export async function keepTask(id: string, now = new Date()) {
  const db = getPopsDb();
  await db.$transaction(async (tx) => {
    await touchHumanEngagement(tx, id, now);
    await appendHistory(tx, {
      taskId: id,
      kind: "resurfacing",
      actor: "human",
      summary: "Confirmed still relevant",
      createdAt: now,
    });
  });
}
