import type { PopsWorkspace } from "@prisma/client";
import { z } from "zod";
import { ANKI_DEFAULT_DECK, WORKSPACE_KEYS } from "@/lib/pops/constants";

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1).max(max);
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:", "obsidian:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Must be an http(s) or obsidian:// URL");

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[A-Za-z0-9._:-]+$/, "Use letters, numbers, '.', '_', ':' or '-'");

export const tagListSchema = z
  .array(text(40).toLowerCase())
  .max(12)
  .transform((tags) => Array.from(new Set(tags.filter(Boolean))));

export const workspaceSchema = z.enum(WORKSPACE_KEYS as [PopsWorkspace, ...PopsWorkspace[]]);

export const createTaskSchema = z.object({
  taskMode: z.enum(["agent", "checklist"]).default("agent"),
  title: required(200),
  description: text(8000).default(""),
  workspace: workspaceSchema,
  projectTags: tagListSchema.default([]),
  parentId: z.string().trim().max(40).optional(),
  suggestedNextAction: text(500).default(""),
  recommendedPipelines: z.array(text(60)).max(8).default([]),
  idempotencyKey: idempotencyKeySchema.optional(),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const agentTaskPatchSchema = z.object({
  title: required(200).optional(),
  description: text(8000).optional(),
  projectTags: tagListSchema.optional(),
  workspace: workspaceSchema.optional(),
  expectedUpdatedAt: z.iso.datetime(),
}).strict().refine((patch) => patch.title !== undefined || patch.description !== undefined || patch.projectTags !== undefined || patch.workspace !== undefined, "Supply at least one task detail to change.");
export type AgentTaskPatchInput = z.input<typeof agentTaskPatchSchema>;

export const sourceSchema = z.object({
  title: required(300),
  url: httpUrl.optional(),
  author: text(200).optional(),
  kind: z
    .enum(["textbook", "lecture", "video", "paper", "essay", "article", "primary", "documentation", "code", "dataset", "other"])
    .default("other"),
  note: text(600).optional(),
});

export const ankiCardSchema = z.object({
  version: z.literal(1).default(1),
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{8,80}$/, "Card ids are 8–80 chars of lowercase letters, digits, '-' or '_'"),
  deck: text(200).default(ANKI_DEFAULT_DECK),
  front: required(4000),
  back: required(12000),
  sourceUrl: httpUrl.optional(),
});
export type AnkiCard = z.infer<typeof ankiCardSchema>;

export const artefactSchema = z.object({
  title: required(300),
  kind: z.enum(["link", "document", "pull_request", "anki_cards", "dataset", "code", "other"]).default("link"),
  url: httpUrl.optional(),
  summary: text(1000).optional(),
  cards: z.array(ankiCardSchema).max(40).optional(),
});

export const decisionOptionSchema = z.object({
  label: required(200),
  explanation: text(800).optional(),
});

export const createDecisionSchema = z.object({
  question: required(500),
  recommendation: text(200).default(""),
  options: z.array(decisionOptionSchema).min(1).max(6),
  explanation: text(2000).default(""),
  evidence: z.array(sourceSchema).max(10).default([]),
  idempotencyKey: idempotencyKeySchema.optional(),
});
export type CreateDecisionInput = z.input<typeof createDecisionSchema>;

export const proposalSchema = z.object({
  kind: z.enum(["playbook_observation", "playbook_change", "pipeline_change", "new_pipeline"]),
  pipelineSlug: text(60).optional(),
  taskId: z.string().trim().max(40).optional(),
  title: required(200),
  body: required(12000),
  rationale: text(2000).default(""),
  idempotencyKey: idempotencyKeySchema.optional(),
});
export type ProposalInput = z.input<typeof proposalSchema>;

/**
 * An agent-run report. Deliberately has no field that can change the task's
 * status: agent activity and task completion are separate.
 */
export const agentRunSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  pipeline: text(60).optional(),
  pipelineVersion: z.number().int().positive().optional(),
  agentName: text(80).default(""),
  outcome: z.enum(["completed", "partial", "blocked", "failed"]),
  attempted: required(2000),
  accomplished: required(4000),
  sources: z.array(sourceSchema).max(40).default([]),
  artefacts: z.array(artefactSchema).max(20).default([]),
  uncertainties: text(3000).default(""),
  blockers: text(3000).default(""),
  nextActions: z.array(required(400)).max(8).default([]),
  suggestedNextAction: text(500).optional(),
  decisions: z.array(createDecisionSchema.omit({ idempotencyKey: true })).max(5).default([]),
  proposals: z.array(proposalSchema.omit({ idempotencyKey: true, taskId: true })).max(5).default([]),
  pipelineReview: text(2000).default(""),
});
export type AgentRunInput = z.input<typeof agentRunSchema>;
export type AgentRunReport = z.output<typeof agentRunSchema>;

export const feedbackSchema = z.object({
  useful: z.boolean(),
  reason: text(300).default(""),
  comments: text(2000).default(""),
});

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
