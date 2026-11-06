import Link from "next/link";
import { WORKSPACES } from "@/lib/pops/constants";
import { getPipelineStats, listPipelines, listProposals } from "@/lib/pops/library";

export const metadata = { title: "Pipelines" };

export default async function PipelinesPage() {
  const [pipelines, stats, proposals] = await Promise.all([
    listPipelines({ includeArchived: true }),
    getPipelineStats(),
    listProposals("pending"),
  ]);
  const pipelineProposals = proposals.filter((p) => p.kind === "pipeline_change" || p.kind === "new_pipeline");

  return (
    <>
      <div className="pops-pagehead">
        <h1>Pipelines</h1>
        <Link href="/pops/pipelines/new">New pipeline</Link>
      </div>
      <p className="pops-lede">
        Small, reusable instruction sets. Editing saves a new version; earlier versions are kept and runs record the version they used.
      </p>

      {pipelineProposals.length ? (
        <section className="pops-strip pops-strip--decisions" aria-labelledby="h-props">
          <h2 id="h-props">Agent proposals to review</h2>
          <ul>
            {pipelineProposals.map((p) => (
              <li key={p.id}>
                {p.kind === "new_pipeline" ? (
                  <Link href={`/pops/pipelines/new?proposal=${p.id}`}>New: {p.title}</Link>
                ) : (
                  <Link href={`/pops/pipelines/${p.pipeline?.slug}?proposal=${p.id}`}>{p.pipeline?.name}: {p.title}</Link>
                )}
                {p.task ? <span className="pops-meta">from {p.task.title}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <table className="pops-library">
        <thead>
          <tr>
            <th scope="col">Pipeline</th>
            <th scope="col">Workspace</th>
            <th scope="col">Version</th>
            <th scope="col">Feedback</th>
          </tr>
        </thead>
        <tbody>
          {pipelines.map((p) => {
            const s = stats.get(p.slug);
            return (
              <tr key={p.slug}>
                <td>
                  <Link href={`/pops/pipelines/${p.slug}`}>{p.name}</Link>
                  {p.archived ? <span className="pops-tag"> archived</span> : null}
                  <div className="pops-small pops-muted">{p.summary}</div>
                </td>
                <td className="pops-ws">{p.workspace ? WORKSPACES[p.workspace].label : "Any"}</td>
                <td className="pops-meta">v{p.currentVersion}</td>
                <td className="pops-meta">
                  {s ? (
                    <>
                      {s.runs} {s.runs === 1 ? "run" : "runs"}
                      <br />
                      {s.useful} useful · {s.notUseful} not
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
