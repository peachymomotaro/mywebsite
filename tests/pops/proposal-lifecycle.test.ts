// @vitest-environment node
import { describe, expect, it } from "vitest";
import { groupPipelineSuggestions } from "@/lib/pops/proposal-groups";
import { changedLines } from "@/components/pops/PipelineInstructionEditor";
import { proposalSchema } from "@/lib/pops/validation";

const proposal = (id: string, slug: string, title: string) => ({
  id, title, rationale: "", kind: "pipeline_change",
  pipeline: { slug, name: slug },
});

describe("proposal lifecycle review", () => {
  it("groups identical changes across several named pipelines without obscuring targets", () => {
    const groups = groupPipelineSuggestions([
      proposal("1", "flashcard", "Main flashcard pipeline: positive-definition proofreading pass"),
      proposal("2", "flashcard-ladder", "Difficulty ladder: positive-definition proofreading pass"),
      proposal("3", "anki-triage", "Anki triage rewrites: positive-definition proofreading pass"),
      proposal("4", "conversational-depth", "Require atomic answerlines"),
      proposal("5", "conversational-depth", "Allow meaningful answerlines"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe("Positive-definition proofreading pass");
    expect(groups[0].targets.map((t) => t.slug)).toEqual(["flashcard", "flashcard-ladder", "anki-triage"]);
    expect(groups[1].title).toBe("conversational-depth");
    expect(groups[1].proposals).toHaveLength(2);
  });

  it("does not combine unrelated new pipeline suggestions", () => {
    const groups = groupPipelineSuggestions([
      { id: "a", title: "Explore notes", rationale: "", kind: "new_pipeline", pipeline: null },
      { id: "b", title: "Build accessibility", rationale: "", kind: "new_pipeline", pipeline: null },
    ]);
    expect(groups).toHaveLength(2);
  });

  it("shows only exact added and removed instruction lines", () => {
    expect(changedLines("first\nold\nlast", "first\nnew\nlast")).toEqual([
      { kind: "removed", text: "old" },
      { kind: "added", text: "new" },
    ]);
    expect(changedLines("same", "same")).toEqual([]);
  });

  it("accepts explicit supersedes references but does not confuse task IDs with proposals", () => {
    expect(proposalSchema.parse({ kind: "pipeline_change", pipelineSlug: "flashcard", title: "Improve answers", body: "New details", supersedes: ["cmw_example"] }).supersedes).toEqual(["cmw_example"]);
    expect(proposalSchema.parse({ kind: "pipeline_change", title: "Improve answers", body: "New details" }).supersedes).toEqual([]);
  });
});
