import Link from "next/link";
import { WORKSPACES } from "@/lib/pops/constants";
import { DeletePipelineControl } from "@/components/pops/DeletePipelineControl";
import { getPipelineStats, isSystemPipeline, listPipelines, listProposals } from "@/lib/pops/library";
import { groupPipelineSuggestions } from "@/lib/pops/proposal-groups";

export const metadata = { title: "Pipelines" };

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ archived?: string; deleted?: string }> }) {
  const { archived, deleted } = await searchParams;
  const showArchived = archived === "1";
  const [all, stats, proposals] = await Promise.all([listPipelines({ includeArchived: true }), getPipelineStats(), listProposals("pending")]);
  const pipelines = all.filter((p) => p.archived === showArchived);
  const archivedCount = all.filter((p) => p.archived).length;
  const pipelineProposals = proposals.filter((p) => p.kind === "pipeline_change" || p.kind === "new_pipeline");
  const reviewGroups = groupPipelineSuggestions(pipelineProposals);

  return (
    <>
      <div className="pops-pagehead">
        <h1>Pipelines</h1>
        <Link href="/pops/pipelines/new" className="pops-small">New pipeline</Link>
      </div>
      <p className="pops-lede">Reusable instructions you hand to an agent. Edits are saved as new versions.</p>
      {deleted === "1" ? <p className="pops-notice" role="status">Pipeline deleted. Its previous runs and versions were preserved.</p> : null}

      {reviewGroups.length ? (
        <section className="pops-attention" aria-labelledby="h-props">
          <h2 id="h-props">Suggested by agents</h2>
          <p className="pops-small pops-muted">Related suggestions are grouped. You approve changes separately for each named pipeline.</p>
          <ul className="pops-list">
            {reviewGroups.map((group) => (
              <li key={group.key}>
                <div className="pops-row">
                  <strong>{group.title}</strong>
                  <span className="pops-meta">{group.proposals.length} {group.proposals.length === 1 ? "suggestion" : "suggestions"} · {group.targets.length || 1} {group.targets.length === 1 ? "target" : "targets"}</span>
                </div>
                <div className="pops-sub">
                  {group.targets.length
                    ? <>Changes to: {group.targets.map((t) => t.name + ` (${t.slug})`).join(", ")}</>
                    : "Proposes creating a new pipeline"}
                </div>
                {group.targets.length === 1 ? (
                  <Link href={`/pops/pipelines/${group.targets[0].slug}?edit=1`} className="pops-small">Review changes to {group.targets[0].name}</Link>
                ) : null}
                <details className="pops-more">
                  <summary>See {group.proposals.length === 1 ? "proposal" : "individual suggestions"}</summary>
                  {group.proposals.map((p) => (
                    <div key={p.id} className="pops-proposal" style={{ marginTop: 8, marginBottom: 8 }}>
                      <strong>{p.title}</strong>
                      <p className="pops-small">Target: {p.pipeline ? `${p.pipeline.name} (${p.pipeline.slug})` : "New pipeline"}</p>
                      {p.rationale ? <p className="pops-small">{p.rationale.slice(0, 220)}{p.rationale.length > 220 ? "…" : ""}</p> : null}
                      <div className="pops-actions">
                        <Link href={p.kind === "new_pipeline" ? `/pops/pipelines/new?proposal=${p.id}` : `/pops/pipelines/${p.pipeline?.slug}?proposal=${p.id}`}>Review target</Link>
                        <details><summary>Full original suggestion</summary><div className="pops-pre">{p.body}</div></details>
                      </div>
                    </div>
                  ))}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="pops-list" style={{ borderTop: "var(--pops-rule)" }}>
        {pipelines.map((p) => {
          const s = stats.get(p.slug);
          return (
            <li key={p.slug}>
              <div className="pops-row">
                <Link href={`/pops/pipelines/${p.slug}`} className="pops-plain">{p.name}</Link>
                <span className="pops-meta">{p.workspace ? WORKSPACES[p.workspace].label : "Any workspace"}</span>
                {!isSystemPipeline(p.slug) ? <DeletePipelineControl id={p.id} name={p.name} /> : null}
              </div>
              <div className="pops-sub">
                {p.summary}
                {s ? ` Used ${s.runs} ${s.runs === 1 ? "time" : "times"}${s.useful + s.notUseful ? `, ${s.useful} marked useful` : ""}.` : ""}
              </div>
            </li>
          );
        })}
      </ul>
      {archivedCount ? (
        <p className="pops-small" style={{ marginTop: 14 }}>
          {showArchived ? <Link href="/pops/pipelines">Back to active pipelines</Link> : <Link href="/pops/pipelines?archived=1">Archived ({archivedCount})</Link>}
        </p>
      ) : null}
    </>
  );
}
