// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PopsPipeline } from "@prisma/client";
import { FOUNDATIONAL_BOUNDARIES } from "@/lib/pops/constants";
import { buildDecisionCopy } from "@/lib/pops/decision-copy";
import { DEFAULT_PIPELINES, DEFAULT_PLAYBOOK } from "@/lib/pops/defaults";
import { rankPipelinesForTask } from "@/lib/pops/library";
import { buildPipelinePrompt, buildTaskBrief, reportTemplate, type PromptContext, type PromptPipeline } from "@/lib/pops/prompt";
import { agentRunSchema } from "@/lib/pops/validation";

const context: PromptContext = {
  task: {
    id: "task_ebm",
    title: "Understand energy-based models",
    description: "Build enough intuition to read recent EBM papers.",
    workspace: "learn",
    projectTags: ["ml"],
    status: "active",
    suggestedNextAction: "Find a textbook chapter",
    parent: null,
    subtasks: [{ id: "s1", title: "Contrastive divergence", status: "active" }],
    links: [],
  },
  priorRuns: [
    {
      date: "2026-11-01",
      pipeline: "learn-intro-pair",
      outcome: "completed",
      accomplished: "Found LeCun's 2006 tutorial and a Stanford CS236 lecture.",
      nextActions: ["Find a textbook chapter"],
      uncertainties: "Lecture may assume VAEs.",
      sources: [{ title: "A Tutorial on Energy-Based Learning", url: "https://example.org/lecun2006.pdf" }],
      feedback: { useful: true, reason: "Good picks" },
    },
  ],
  decisions: [
    { question: "Go deeper on score matching?", status: "answered", chosenOption: "Later", response: "After the textbook." },
    { question: "Include Hopfield networks?", status: "open", chosenOption: "", response: "" },
  ],
  notes: [{ date: "2026-11-02", text: "I know VAEs well.", url: null }],
};

const template = DEFAULT_PIPELINES.find((p) => p.slug === "learn-textbook-anki")!;
const pipeline: PromptPipeline = {
  slug: template.slug,
  name: template.name,
  version: 3,
  instructions: template.instructions,
  expectedEvidence: template.expectedEvidence,
  recentCriticism: ["Cards were too long"],
};

function build(includePipelineReview = false) {
  return buildPipelinePrompt({
    context,
    pipeline,
    playbook: { version: 2, content: DEFAULT_PLAYBOOK },
    idempotencyKey: "task_ebm.learn-textbook-anki.abcd1234",
    apiBaseUrl: "https://petercurry.org",
    includePipelineReview,
  });
}

describe("standalone task status", () => {
  it("carries task history, decisions and notes but no workflow instructions", () => {
    const status = buildTaskBrief(context, "https://petercurry.org");
    expect(status).toContain("# POps task status: Understand energy-based models");
    expect(status).toContain("Build enough intuition");
    expect(status).toContain("Found LeCun's 2006 tutorial");
    expect(status).toContain("Still open — Include Hopfield networks? (unresolved)");
    expect(status).toContain("I know VAEs well.");
    expect(status).toContain("https://petercurry.org/pops/tasks/task_ebm");
    expect(status).not.toContain("## Pipeline:");
    expect(status).not.toContain("## Shared playbook");
    expect(status).not.toContain("## Permission boundaries");
    expect(status).not.toContain("## Write back to POps");
    expect(status).not.toContain("pops-report");
  });
});

describe("pipeline prompt generation", () => {
  it("contains task identity, context, previous work, decisions and notes", () => {
    const prompt = build();
    expect(prompt).toContain("# POps task: Understand energy-based models");
    expect(prompt).toContain("`task_ebm`");
    expect(prompt).toContain("Build enough intuition");
    expect(prompt).toContain("Contrastive divergence (active)");
    expect(prompt).toContain("[A Tutorial on Energy-Based Learning](https://example.org/lecun2006.pdf)");
    expect(prompt).toContain("Peter's feedback: useful — Good picks");
    expect(prompt).toContain("Decided — Go deeper on score matching?: Later. After the textbook.");
    expect(prompt).toContain("Still open — Include Hopfield networks? (do not assume an answer)");
    expect(prompt).toContain("I know VAEs well.");
  });

  it("includes the selected pipeline version, its evidence requirements and recent criticism", () => {
    const prompt = build();
    expect(prompt).toContain("## Pipeline: Textbook chapter → three Anki cards (`learn-textbook-anki` v3)");
    expect(prompt).toContain("Further reading:");
    expect(prompt).toContain("**Expected evidence:**");
    expect(prompt).toContain("Cards were too long");
  });

  it("places foundational boundaries after the playbook so the playbook cannot override them", () => {
    const prompt = build();
    const playbookAt = prompt.indexOf("## Shared playbook (v2)");
    const boundariesAt = prompt.indexOf("## Permission boundaries");
    expect(playbookAt).toBeGreaterThan(0);
    expect(boundariesAt).toBeGreaterThan(playbookAt);
    for (const boundary of FOUNDATIONAL_BOUNDARIES) expect(prompt).toContain(boundary);
    expect(prompt).toContain("Only write flashcards to the Quiz Trainer Anki inbox after the user confirms");
  });

  it("asks for a structured write-back with the idempotency key and never a status change", () => {
    const prompt = build();
    expect(prompt).toContain("```pops-report");
    expect(prompt).toContain('"idempotencyKey": "task_ebm.learn-textbook-anki.abcd1234"');
    expect(prompt).toContain("pops_record_agent_run");
    expect(prompt).toContain("Do not set or suggest a task status field");
    expect(prompt).not.toMatch(/"status"\s*:/);
  });

  it("adds the optional pipeline-review step only when asked", () => {
    expect(build(false)).not.toContain("## Pipeline review");
    expect(build(true)).toContain("## Pipeline review (requested)");
  });

  it("produces a report template whose shape the importer accepts once filled in", () => {
    const filled = reportTemplate("task_ebm", pipeline, "task_ebm.learn-textbook-anki.abcd1234").report;
    const result = agentRunSchema.safeParse({ ...filled, outcome: "completed", decisions: [], sources: [], artefacts: [] });
    expect(result.success).toBe(true);
  });
});

describe("pipeline ranking", () => {
  const pipeline = (slug: string, workspace: PopsPipeline["workspace"]) =>
    ({ id: slug, slug, name: slug, workspace, archived: false }) as PopsPipeline;
  const all = [pipeline("a-learn", "learn"), pipeline("b-learn", "learn"), pipeline("general", null), pipeline("work", "work")];

  it("puts explicit recommendations first, then the workspace, then the rest", () => {
    const ranked = rankPipelinesForTask({ workspace: "learn", recommendedPipelines: ["work"] }, all, new Map());
    expect(ranked.recommended.map((p) => p.slug)).toEqual(["work", "a-learn", "b-learn"]);
    expect(ranked.other.map((p) => p.slug)).toEqual(["general"]);
  });

  it("uses feedback to order pipelines within a group", () => {
    const stats = new Map([
      ["a-learn", { runs: 3, useful: 0, notUseful: 3 }],
      ["b-learn", { runs: 2, useful: 2, notUseful: 0 }],
    ]);
    const ranked = rankPipelinesForTask({ workspace: "learn", recommendedPipelines: [] }, all, stats);
    expect(ranked.recommended.map((p) => p.slug)).toEqual(["b-learn", "a-learn"]);
  });
});

describe("decision copy for an agent", () => {
  it("includes the question, options, recommendation, evidence and task context", () => {
    const text = buildDecisionCopy({
      task: { id: "t1", title: "Fix flaky deploy", description: "CI fails on Mondays", workspace: "work", suggestedNextAction: "" },
      decision: {
        id: "d1",
        question: "Pin the Node version?",
        recommendation: "Pin to 22.x",
        options: [{ label: "Pin to 22.x", explanation: "Matches engines" }, { label: "Leave floating" }],
        explanation: "The failures started after a runner update.",
        evidence: [{ title: "Runner changelog", url: "https://example.com/log" }],
      },
      recentWork: ["2026-11-05: Found the runner update"],
      baseUrl: "https://petercurry.org",
    });
    expect(text).toContain("Question: Pin the Node version?");
    expect(text).toContain("1. Pin to 22.x (recommended) — Matches engines");
    expect(text).toContain("- Runner changelog https://example.com/log");
    expect(text).toContain("Task: Fix flaky deploy (Work, id t1)");
    expect(text).toContain("Do not record the decision for me.");
  });
});
