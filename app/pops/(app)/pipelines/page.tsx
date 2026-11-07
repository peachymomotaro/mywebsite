import Link from "next/link";
import { WORKSPACES } from "@/lib/pops/constants";
import { getPipelineStats, listPipelines, listProposals } from "@/lib/pops/library";

export const metadata = { title: "Pipelines" };

export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const [all, stats, proposals] = await Promise.all([listPipelines({ includeArchived: true }), getPipelineStats(), listProposals("pending")]);
  const pipelines = all.filter((p) => p.archived === showArchived);
  const archivedCount = all.filter((p) => p.archived).length;
  const pipelineProposals = proposals.filter((p) => p.kind === "pipeline_change" || p.kind === "new_pipeline");

  return (
    <>
      <div className="pops-pagehead">
        <h1>Pipelines</h1>
        <Link href="/pops/pipelines/new" className="pops-small">New pipeline</Link>
      </div>
      <p className="pops-lede">Reusable instructions you hand to ChatGPT. Edits are saved as new versions.</p>

      {pipelineProposals.length ? (
        <section className="pops-attention" aria-labelledby="h-props">
          <h2 id="h-props">Suggested by agents</h2>
          <ul className="pops-list">
            {pipelineProposals.map((p) => (
              <li key={p.id}>
                <div className="pops-row">
                  {p.kind === "new_pipeline" ? (
                    <Link href={`/pops/pipelines/new?proposal=${p.id}`}>New pipeline: {p.title}</Link>
                  ) : (
                    <Link href={`/pops/pipelines/${p.pipeline?.slug}?proposal=${p.id}`}>{p.pipeline?.name}: {p.title}</Link>
                  )}
                  <span className="pops-meta">review</span>
                </div>
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
