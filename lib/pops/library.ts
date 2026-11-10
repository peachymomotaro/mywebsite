import type { PopsActor, PopsPipeline, PopsTask, PopsWorkspace } from "@prisma/client";
import { getPopsDb } from "@/lib/pops/db";
import { DEFAULT_PIPELINES, DEFAULT_PLAYBOOK } from "@/lib/pops/defaults";
import { PopsConflictError, PopsNotFoundError } from "@/lib/pops/tasks";
import { proposalSchema, type ProposalInput } from "@/lib/pops/validation";

/**
 * Seeds the template library and the first playbook version the first time
 * POps is used. It never recreates templates the owner has archived or edited.
 */
export async function ensurePopsDefaults() {
  const db = getPopsDb();
  const [pipelineCount, playbookCount] = await Promise.all([db.popsPipeline.count(), db.popsPlaybookVersion.count()]);

  // Explicit additive defaults reach existing installations without overwriting
  // versions the owner has edited or templates they have archived.
  const additions = ["work-implement-change", "work-review-implementation"];
  const templates = pipelineCount === 0
    ? DEFAULT_PIPELINES
    : DEFAULT_PIPELINES.filter((pipeline) => additions.includes(pipeline.slug));
  const existing = pipelineCount === 0
    ? new Set<string>()
    : new Set((await db.popsPipeline.findMany({
      where: { slug: { in: additions } },
      select: { slug: true },
    })).map((pipeline) => pipeline.slug));

  for (const template of templates) {
    if (existing.has(template.slug)) continue;
    await db.popsPipeline.upsert({
        where: { slug: template.slug },
        update: {},
        create: {
          slug: template.slug,
          name: template.name,
          workspace: template.workspace,
          summary: template.summary,
          currentVersion: 1,
          versions: {
            create: {
              version: 1,
              instructions: template.instructions,
              expectedEvidence: template.expectedEvidence,
              changeNote: "Initial template",
              author: "system",
            },
          },
        },
    });
  }

  if (playbookCount === 0) {
    await db.popsPlaybookVersion.createMany({
      data: [{ version: 1, content: DEFAULT_PLAYBOOK, changeNote: "Initial playbook", author: "system" }],
      skipDuplicates: true,
    });
  }
}

export type PipelineStats = { runs: number; useful: number; notUseful: number };

export async function getPipelineStats() {
  const db = getPopsDb();
  const runs = await db.popsAgentRun.findMany({
    where: { pipelineSlug: { not: null } },
    select: { pipelineSlug: true, feedback: { select: { useful: true } } },
  });
  const stats = new Map<string, PipelineStats>();
  for (const run of runs) {
    const entry = stats.get(run.pipelineSlug!) ?? { runs: 0, useful: 0, notUseful: 0 };
    entry.runs += 1;
    if (run.feedback?.useful === true) entry.useful += 1;
    if (run.feedback?.useful === false) entry.notUseful += 1;
    stats.set(run.pipelineSlug!, entry);
  }
  return stats;
}

export async function listPipelines(options: { includeArchived?: boolean } = {}) {
  await ensurePopsDefaults();
  return getPopsDb().popsPipeline.findMany({
    where: { deletedAt: null, ...(options.includeArchived ? {} : { archived: false }) },
    orderBy: [{ workspace: "asc" }, { name: "asc" }],
  });
}

/**
 * Orders pipelines for a task: explicitly recommended first, then the task's
 * workspace, then general templates. Within a group, feedback breaks ties so
 * pipelines that proved useful rise and unhelpful ones sink.
 */
export function rankPipelinesForTask(
  task: Pick<PopsTask, "workspace" | "recommendedPipelines">,
  pipelines: PopsPipeline[],
  stats: Map<string, PipelineStats>,
) {
  const score = (slug: string) => {
    const s = stats.get(slug);
    return s ? s.useful - s.notUseful : 0;
  };
  const group = (pipeline: PopsPipeline) => {
    const recommended = task.recommendedPipelines.indexOf(pipeline.slug);
    if (recommended >= 0) return recommended;
    if (pipeline.workspace === task.workspace) return 100;
    if (pipeline.workspace === null) return 200;
    return 300;
  };
  const ranked = pipelines
    .filter((pipeline) => !pipeline.archived)
    .sort((a, b) => group(a) - group(b) || score(b.slug) - score(a.slug) || a.name.localeCompare(b.name));
  return {
    recommended: ranked.filter((pipeline) => group(pipeline) < 200),
    other: ranked.filter((pipeline) => group(pipeline) >= 200),
  };
}

export async function getPipeline(slug: string) {
  await ensurePopsDefaults();
  return getPopsDb().popsPipeline.findUnique({
    where: { slug, deletedAt: null },
    include: {
      versions: { orderBy: { version: "desc" } },
      proposals: { where: { status: "pending" }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getPipelineVersion(slug: string, version?: number) {
  const pipeline = await getPipeline(slug);
  if (!pipeline) return null;
  const wanted = version ?? pipeline.currentVersion;
  const found = pipeline.versions.find((v) => v.version === wanted);
  return found ? { pipeline, version: found } : null;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,59}$/;
const PIPELINE_ID_PATTERN = /^c[a-z0-9]{20,39}$/;

/** System templates remain protected even after the owner adds newer versions. */
export function isSystemPipeline(slug: string) {
  return DEFAULT_PIPELINES.some((pipeline) => pipeline.slug === slug);
}

/** A confirmed deletion is a tombstone: never remove immutable versions or runs. */
export async function deletePipeline(id: string, now = new Date()) {
  if (!PIPELINE_ID_PATTERN.test(id)) throw new Error("Invalid pipeline ID.");
  return getPopsDb().$transaction(async (tx) => {
    const pipeline = await tx.popsPipeline.findUnique({
      where: { id },
      include: { versions: { where: { version: 1 }, select: { author: true } } },
    });
    if (!pipeline || pipeline.deletedAt) throw new PopsNotFoundError("Pipeline");
    if (isSystemPipeline(pipeline.slug) || pipeline.versions.some((version) => version.author === "system")) {
      throw new PopsConflictError("System pipelines cannot be deleted.");
    }
    const updated = await tx.popsPipeline.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: now },
    });
    if (updated.count !== 1) throw new PopsConflictError("The pipeline changed. Reload and try again.");
    return pipeline.slug;
  });
}

export async function createPipeline(
  input: {
    slug: string;
    name: string;
    workspace: PopsWorkspace | null;
    summary: string;
    instructions: string;
    expectedEvidence: string;
    changeNote?: string;
    proposalId?: string;
  },
  now = new Date(),
) {
  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) throw new Error("Slug must be 3–60 lowercase letters, digits or hyphens.");
  if (!input.name.trim() || !input.instructions.trim()) throw new Error("Name and instructions are required.");
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    if (await tx.popsPipeline.findUnique({ where: { slug } })) throw new PopsConflictError("That slug is taken.");
    const pipeline = await tx.popsPipeline.create({
      data: {
        slug,
        name: input.name.trim().slice(0, 120),
        workspace: input.workspace,
        summary: input.summary.trim().slice(0, 400),
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            instructions: input.instructions.trim(),
            expectedEvidence: input.expectedEvidence.trim(),
            changeNote: input.changeNote?.trim() || "Created",
            author: "human",
            createdAt: now,
          },
        },
      },
    });
    if (input.proposalId) await markProposal(tx, input.proposalId, "accepted", "Applied as a new pipeline", now);
    return pipeline;
  });
}

/** Saves a new immutable version. Earlier versions are never edited. */
export async function savePipelineVersion(
  slug: string,
  input: {
    name?: string;
    summary?: string;
    workspace?: PopsWorkspace | null;
    instructions: string;
    expectedEvidence: string;
    changeNote: string;
    proposalId?: string;
  },
  author: PopsActor = "human",
  now = new Date(),
) {
  if (!input.instructions.trim()) throw new Error("Instructions are required.");
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const pipeline = await tx.popsPipeline.findUnique({ where: { slug } });
    if (!pipeline || pipeline.deletedAt) throw new PopsNotFoundError("Pipeline");
    const nextVersion = pipeline.currentVersion + 1;
    await tx.popsPipelineVersion.create({
      data: {
        pipelineId: pipeline.id,
        version: nextVersion,
        instructions: input.instructions.trim(),
        expectedEvidence: input.expectedEvidence.trim(),
        changeNote: input.changeNote.trim().slice(0, 300) || "Edited",
        author,
        createdAt: now,
      },
    });
    // Optimistic concurrency: only advance if nobody else did meanwhile.
    const advanced = await tx.popsPipeline.updateMany({
      where: { id: pipeline.id, currentVersion: pipeline.currentVersion, deletedAt: null },
      data: {
        currentVersion: nextVersion,
        name: input.name?.trim() ? input.name.trim().slice(0, 120) : undefined,
        summary: input.summary !== undefined ? input.summary.trim().slice(0, 400) : undefined,
        workspace: input.workspace !== undefined ? input.workspace : undefined,
      },
    });
    if (advanced.count !== 1) throw new PopsConflictError("The pipeline changed while you were editing. Reload and try again.");
    if (input.proposalId) await markProposal(tx, input.proposalId, "accepted", `Applied as version ${nextVersion}`, now);
    return nextVersion;
  });
}

export async function setPipelineArchived(slug: string, archived: boolean) {
  const changed = await getPopsDb().popsPipeline.updateMany({ where: { slug, deletedAt: null }, data: { archived } });
  if (!changed.count) throw new PopsNotFoundError("Pipeline");
}

export async function getCurrentPlaybook() {
  await ensurePopsDefaults();
  const current = await getPopsDb().popsPlaybookVersion.findFirst({ orderBy: { version: "desc" } });
  if (!current) throw new Error("Playbook missing");
  return current;
}

export async function listPlaybookVersions() {
  return getPopsDb().popsPlaybookVersion.findMany({ orderBy: { version: "desc" } });
}

export async function savePlaybookVersion(
  input: { content: string; changeNote: string; baseVersion: number; proposalId?: string },
  now = new Date(),
) {
  if (!input.content.trim()) throw new Error("The playbook cannot be empty.");
  const db = getPopsDb();
  return db.$transaction(async (tx) => {
    const latest = await tx.popsPlaybookVersion.findFirst({ orderBy: { version: "desc" } });
    if (latest && latest.version !== input.baseVersion) {
      throw new PopsConflictError("The playbook changed while you were editing. Reload and try again.");
    }
    const version = (latest?.version ?? 0) + 1;
    // The unique index on version rejects a concurrent save of the same number.
    await tx.popsPlaybookVersion.create({
      data: {
        version,
        content: input.content.trim() + "\n",
        changeNote: input.changeNote.trim().slice(0, 300) || "Edited",
        author: "human",
        proposalId: input.proposalId,
        createdAt: now,
      },
    });
    if (input.proposalId) await markProposal(tx, input.proposalId, "accepted", `Applied in playbook v${version}`, now);
    return version;
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getPopsDb>["$transaction"]>[0]>[0];

async function markProposal(tx: Tx, id: string, status: "accepted" | "rejected", reviewNote: string, now: Date) {
  await tx.popsProposal.updateMany({
    where: { id, status: "pending" },
    data: { status, reviewNote: reviewNote.slice(0, 500), reviewedAt: now },
  });
}

/**
 * Agents may only propose. A proposal never changes the playbook or a
 * pipeline until the owner applies it in the editor.
 */
export async function createProposal(input: ProposalInput, now = new Date()) {
  const data = proposalSchema.parse(input);
  const db = getPopsDb();
  const dedupeKey = data.idempotencyKey ? `proposal:${data.idempotencyKey}` : undefined;
  if (dedupeKey) {
    const existing = await db.popsProposal.findUnique({ where: { dedupeKey } });
    if (existing) return { proposal: existing, duplicate: true };
  }
  let pipelineId: string | undefined;
  if (data.kind === "pipeline_change") {
    if (!data.pipelineSlug) throw new Error("pipelineSlug is required for a pipeline_change proposal.");
    const pipeline = await db.popsPipeline.findUnique({ where: { slug: data.pipelineSlug } });
    if (!pipeline || pipeline.deletedAt) throw new PopsNotFoundError("Pipeline");
    pipelineId = pipeline.id;
  }
  if (data.taskId && !(await db.popsTask.findUnique({ where: { id: data.taskId }, select: { id: true } }))) {
    throw new PopsNotFoundError("Task");
  }
  const proposal = await db.popsProposal.create({
    data: {
      kind: data.kind,
      pipelineId,
      taskId: data.taskId,
      title: data.title,
      body: data.body,
      rationale: data.rationale,
      dedupeKey,
      createdAt: now,
    },
  });
  return { proposal, duplicate: false };
}

export async function listProposals(status: "pending" | "accepted" | "rejected" = "pending") {
  return getPopsDb().popsProposal.findMany({
    where: { status, OR: [{ pipelineId: null }, { pipeline: { deletedAt: null } }] },
    orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
    take: 100,
    include: { pipeline: { select: { slug: true, name: true } }, task: { select: { id: true, title: true } } },
  });
}

export async function getProposal(id: string) {
  return getPopsDb().popsProposal.findUnique({
    where: { id },
    include: { pipeline: { select: { slug: true, name: true, deletedAt: true } } },
  });
}

export async function reviewProposal(id: string, status: "accepted" | "rejected", reviewNote: string, now = new Date()) {
  const db = getPopsDb();
  await db.$transaction((tx) => markProposal(tx, id, status, reviewNote, now));
}
