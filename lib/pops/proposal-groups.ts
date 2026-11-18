/**
 * Presentation-only grouping. Different targets are NEVER silently applied
 * together: each affected pipeline still requires its own explicit save.
 */
export type PipelineSuggestion = {
  id: string;
  title: string;
  kind: string;
  rationale: string;
  pipeline: { slug: string; name: string } | null;
};

export type PipelineSuggestionGroup<T extends PipelineSuggestion> = {
  key: string;
  title: string;
  proposals: T[];
  targets: { slug: string; name: string }[];
};

function repeatedSubject(title: string): string | null {
  const colon = title.lastIndexOf(":");
  if (colon < 0) return null;
  const subject = title.slice(colon + 1).trim().replace(/\s+/g, " ");
  return subject.length >= 12 ? subject.toLowerCase() : null;
}

export function groupPipelineSuggestions<T extends PipelineSuggestion>(proposals: T[]): PipelineSuggestionGroup<T>[] {
  const subjectCounts = new Map<string, Set<string>>();
  for (const p of proposals) {
    const subject = repeatedSubject(p.title);
    if (!subject || !p.pipeline || p.kind !== "pipeline_change") continue;
    const targets = subjectCounts.get(subject) ?? new Set<string>();
    targets.add(p.pipeline.slug);
    subjectCounts.set(subject, targets);
  }

  const groups = new Map<string, PipelineSuggestionGroup<T>>();
  for (const proposal of proposals) {
    const subject = repeatedSubject(proposal.title);
    const crossPipeline = subject && (subjectCounts.get(subject)?.size ?? 0) >= 2;
    const key = crossPipeline
      ? `topic:${subject}`
      : proposal.kind === "pipeline_change" && proposal.pipeline
        ? `pipeline:${proposal.pipeline.slug}`
        : `individual:${proposal.id}`;
    const title = crossPipeline
      ? subject!.charAt(0).toUpperCase() + subject!.slice(1)
      : proposal.pipeline?.name ?? (proposal.kind === "new_pipeline" ? "New pipeline" : "Suggestion");
    const group = groups.get(key) ?? { key, title, proposals: [], targets: [] };
    group.proposals.push(proposal);
    if (proposal.pipeline && !group.targets.some((t) => t.slug === proposal.pipeline!.slug)) {
      group.targets.push(proposal.pipeline);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}
