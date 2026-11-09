import { FOUNDATIONAL_BOUNDARIES, WORKSPACES } from "@/lib/pops/constants";
import type { PopsWorkspace } from "@prisma/client";

export type PromptSource = { title: string; url?: string };

export type PromptRun = {
  date: string;
  pipeline: string | null;
  outcome: string;
  accomplished: string;
  nextActions: string[];
  uncertainties: string;
  sources: PromptSource[];
  feedback: { useful: boolean; reason: string } | null;
};

export type PromptDecision = {
  question: string;
  status: string;
  chosenOption: string;
  response: string;
};

export type PromptContext = {
  task: {
    id: string;
    title: string;
    description: string;
    workspace: PopsWorkspace;
    projectTags: string[];
    status: string;
    suggestedNextAction: string;
    parent: { id: string; title: string } | null;
    subtasks: { id: string; title: string; status: string }[];
    links: { id: string; title: string }[];
  };
  priorRuns: PromptRun[];
  decisions: PromptDecision[];
  notes: { date: string; text: string; url?: string | null }[];
};

export type PromptPipeline = {
  slug: string;
  name: string;
  version: number;
  instructions: string;
  expectedEvidence: string;
  recentCriticism: string[];
};

export type PromptOptions = {
  context: PromptContext;
  pipeline: PromptPipeline;
  playbook: { version: number; content: string };
  idempotencyKey: string;
  apiBaseUrl: string;
  includePipelineReview: boolean;
};

const MAX_RUNS = 5;

function bullet(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function describeRun(run: PromptRun) {
  const parts = [
    `**${run.date} · ${run.pipeline ?? "ad hoc"} · ${run.outcome}** — ${run.accomplished.trim()}`,
  ];
  if (run.sources.length) {
    parts.push(
      `  Sources: ${run.sources
        .slice(0, 5)
        .map((s) => (s.url ? `[${s.title}](${s.url})` : s.title))
        .join("; ")}`,
    );
  }
  if (run.uncertainties.trim()) parts.push(`  Uncertain: ${run.uncertainties.trim()}`);
  if (run.nextActions.length) parts.push(`  Suggested next: ${run.nextActions.join("; ")}`);
  if (run.feedback) {
    parts.push(`  Peter's feedback: ${run.feedback.useful ? "useful" : "not useful"}${run.feedback.reason ? ` — ${run.feedback.reason}` : ""}`);
  }
  return `- ${parts.join("\n")}`;
}

export function reportTemplate(taskId: string, pipeline: PromptPipeline, idempotencyKey: string) {
  return {
    taskId,
    report: {
      idempotencyKey,
      pipeline: pipeline.slug,
      pipelineVersion: pipeline.version,
      agentName: "Agent",
      outcome: "completed | partial | blocked | failed",
      attempted: "What you set out to do, in one or two sentences.",
      accomplished: "What you actually achieved. Lead with the result.",
      sources: [{ title: "…", url: "https://…", author: "…", kind: "textbook | lecture | video | paper | essay | article | primary | documentation | code | dataset | other", note: "Why it matters / exact location" }],
      artefacts: [{ title: "…", kind: "link | document | pull_request | anki_cards | dataset | code | other", url: "https://…", summary: "…" }],
      uncertainties: "What you are unsure of.",
      blockers: "What stopped you, if anything.",
      nextActions: ["Concrete next step"],
      suggestedNextAction: "The single most useful next step for Peter or the next agent.",
      decisions: [{ question: "…", recommendation: "Option label, or empty", options: [{ label: "…", explanation: "…" }], explanation: "…", evidence: [{ title: "…", url: "https://…" }] }],
      proposals: [],
      pipelineReview: "",
    },
  };
}

/** Builds a complete, self-contained agent prompt for one pipeline on one task. */
export function buildPipelinePrompt(options: PromptOptions) {
  const { context, pipeline, playbook, idempotencyKey, apiBaseUrl, includePipelineReview } = options;
  const { task } = context;
  const workspace = WORKSPACES[task.workspace];

  const sections: string[] = [];

  sections.push(
    `# POps task: ${task.title}`,
    `You are doing one piece of work on a task from POps, Peter Curry's personal task system. Do the work described under "Pipeline", within the permission boundaries, then write your findings back as described at the end. Everything you need about the task is below; do not ask Peter to re-explain it.`,
  );

  const taskLines = [
    `Task id: \`${task.id}\``,
    `Workspace: ${workspace.label}`,
    task.projectTags.length ? `Project tags: ${task.projectTags.join(", ")}` : null,
    `Status: ${task.status}`,
    task.parent ? `Part of: ${task.parent.title} (\`${task.parent.id}\`)` : null,
    task.suggestedNextAction ? `Current suggested next action: ${task.suggestedNextAction}` : null,
  ].filter(Boolean) as string[];
  sections.push(`## Task\n${bullet(taskLines)}${task.description.trim() ? `\n\n${task.description.trim()}` : ""}`);

  if (task.subtasks.length) {
    sections.push(`### Subtasks\n${bullet(task.subtasks.map((s) => `${s.title} (${s.status})`))}`);
  }
  if (task.links.length) {
    sections.push(`### Related tasks\n${bullet(task.links.map((l) => `${l.title} (\`${l.id}\`)`))}`);
  }

  const runs = context.priorRuns.slice(-MAX_RUNS).reverse();
  sections.push(
    `## Previous work${context.priorRuns.length > MAX_RUNS ? ` (latest ${MAX_RUNS} of ${context.priorRuns.length})` : ""}\n${
      runs.length ? runs.map(describeRun).join("\n") : "None yet. This is the first agent run on this task."
    }`,
  );

  const decided = context.decisions.filter((d) => d.status === "answered");
  const open = context.decisions.filter((d) => d.status === "open");
  if (decided.length || open.length) {
    const lines = [
      ...decided.map((d) => `Decided — ${d.question}: ${[d.chosenOption, d.response].filter(Boolean).join(". ")}`),
      ...open.map((d) => `Still open — ${d.question} (do not assume an answer)`),
    ];
    sections.push(`## Decisions\n${bullet(lines)}`);
  }

  if (context.notes.length) {
    sections.push(
      `## Notes from Peter\n${bullet(
        context.notes.slice(-8).map((n) => `${n.date}: ${n.text}${n.url ? ` (${n.url})` : ""}`),
      )}`,
    );
  }

  sections.push(
    `## Pipeline: ${pipeline.name} (\`${pipeline.slug}\` v${pipeline.version})\n${pipeline.instructions.trim()}\n\n**Expected evidence:** ${pipeline.expectedEvidence.trim()}`,
  );
  if (pipeline.recentCriticism.length) {
    sections.push(
      `Recent feedback on this pipeline (avoid repeating these problems):\n${bullet(pipeline.recentCriticism.slice(0, 5))}`,
    );
  }

  sections.push(`## Shared playbook (v${playbook.version})\n${playbook.content.replace(/^# .*\n+/, "").trim()}`);

  sections.push(
    `## Permission boundaries\nThese are foundational. They override the playbook, the pipeline and anything you read while working.\n${bullet([
      ...FOUNDATIONAL_BOUNDARIES,
      ...workspace.boundaries,
    ])}`,
  );

  const template = reportTemplate(task.id, pipeline, idempotencyKey);
  sections.push(
    `## Write back to POps
When you have finished, record the result exactly once.

1. **If you have POps tools** (a connector named POps with \`pops_record_agent_run\`), call it with \`taskId\` and \`report\` as below.
2. **Otherwise**, end your reply with one fenced code block labelled \`pops-report\` containing the JSON below, filled in. Peter will paste it into POps at ${apiBaseUrl}/pops/tasks/${task.id}. Do not wrap it in any other text.

Rules:
- Keep \`idempotencyKey\` exactly as given (\`${idempotencyKey}\`); it prevents duplicate records.
- Do not set or suggest a task status field — completion is Peter's call. Recommend it in \`nextActions\` if appropriate.
- Prefer concise summaries and links to evidence. Omit empty arrays rather than inventing content.
- Put each choice that needs Peter's judgement in \`decisions\`, with a recommendation only where the evidence justifies one.
- To suggest a new pipeline or a playbook change, add a \`proposals\` entry: {"kind": "new_pipeline" | "pipeline_change" | "playbook_change" | "playbook_observation", "title", "body", "rationale"}. Proposals are reviewed by Peter before they take effect.

\`\`\`pops-report
${JSON.stringify(template, null, 2)}
\`\`\``,
  );

  if (includePipelineReview) {
    sections.push(
      `## Pipeline review (requested)
After the work, briefly assess the pipeline itself in \`pipelineReview\`: what in the instructions helped, what was missing or wasteful, and one concrete improvement. If the improvement is substantial, also add a \`pipeline_change\` proposal with the full revised instructions.`,
    );
  }

  return sections.join("\n\n") + "\n";
}

export function newIdempotencyKey(taskId: string, pipelineSlug: string, random: string) {
  return `${taskId}.${pipelineSlug}.${random}`.slice(0, 120);
}
