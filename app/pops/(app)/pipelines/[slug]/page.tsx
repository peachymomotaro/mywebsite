import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePipelineAction, reviewProposalAction, savePipelineAction } from "@/app/pops/actions";
import { PipelineFields } from "@/components/pops/PipelineFields";
import { WORKSPACES } from "@/lib/pops/constants";
import { formatDateTime } from "@/lib/pops/format";
import { getPipeline, getPipelineStats, getProposal } from "@/lib/pops/library";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: (await getPipeline(slug))?.name ?? "Pipeline" };
}

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string; proposal?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { edit, proposal: proposalId, error } = await searchParams;
  const pipeline = await getPipeline(slug);
  if (!pipeline) notFound();
  const current = pipeline.versions.find((v) => v.version === pipeline.currentVersion)!;
  const proposal = proposalId ? await getProposal(proposalId) : null;
  const applying = proposal && proposal.status === "pending" && proposal.pipelineId === pipeline.id ? proposal : null;
  const editing = edit === "1" || Boolean(applying);
  const stats = (await getPipelineStats()).get(slug);
  const back = `/pops/pipelines/${slug}`;

  return (
    <>
      <p className="pops-small pops-muted"><Link href="/pops/pipelines">← Pipelines</Link></p>
      <div className="pops-pagehead">
        <h1>{pipeline.name}</h1>
        {!editing ? <Link href={`${back}?edit=1`}>Edit</Link> : null}
      </div>
      <p className="pops-meta">
        {slug} · v{pipeline.currentVersion} · {pipeline.workspace ? WORKSPACES[pipeline.workspace].label : "any workspace"}
        {stats ? ` · ${stats.runs} runs, ${stats.useful} useful, ${stats.notUseful} not useful` : ""}
        {pipeline.archived ? " · archived" : ""}
      </p>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}
      <p className="pops-lede">{pipeline.summary}</p>

      {editing ? (
        <form action={savePipelineAction}>
          <input type="hidden" name="slug" value={slug} />
          {applying ? (
            <>
              <input type="hidden" name="proposalId" value={applying.id} />
              <div className="pops-proposal">
                <h3>Applying proposal: {applying.title}</h3>
                {applying.rationale ? <p className="pops-small">{applying.rationale}</p> : null}
                <div className="pops-pre">{applying.body}</div>
                <p className="pops-small pops-muted">Merge what you agree with into the instructions below. Nothing changes until you save.</p>
              </div>
            </>
          ) : null}
          <PipelineFields values={{ ...pipeline, instructions: current.instructions, expectedEvidence: current.expectedEvidence }} />
          <div className="pops-actions">
            <button type="submit">Save as v{pipeline.currentVersion + 1}</button>
            <Link href={back}>Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          <h2>Instructions</h2>
          <div className="pops-pre">{current.instructions}</div>
          <h2>Expected evidence</h2>
          <p>{current.expectedEvidence || "—"}</p>
        </>
      )}

      {pipeline.proposals.length && !applying ? (
        <section aria-labelledby="h-proposals">
          <h2 id="h-proposals">Proposals</h2>
          {pipeline.proposals.map((p) => (
            <div key={p.id} className="pops-proposal">
              <strong>{p.title}</strong> <span className="pops-meta">{formatDateTime(p.createdAt)}</span>
              {p.rationale ? <p className="pops-small">{p.rationale}</p> : null}
              <div className="pops-actions">
                <Link href={`${back}?proposal=${p.id}`}>Review and apply</Link>
                <form action={reviewProposalAction}>
                  <input type="hidden" name="proposalId" value={p.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="pops-link-button">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <h2>Versions</h2>
      <ol className="pops-history">
        {pipeline.versions.map((v) => (
          <li key={v.id}>
            <details>
              <summary>
                <span className="pops-meta">{formatDateTime(v.createdAt)}</span>
                <span className="pops-kind" data-actor={v.author}>v{v.version}</span>
                <span>{v.changeNote}</span>
              </summary>
              <div className="pops-entry-body"><div className="pops-pre">{v.instructions}</div></div>
            </details>
          </li>
        ))}
      </ol>

      <form action={archivePipelineAction} style={{ marginTop: 24 }}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="archived" value={pipeline.archived ? "false" : "true"} />
        <button type="submit" className="pops-secondary">{pipeline.archived ? "Restore pipeline" : "Archive pipeline"}</button>
      </form>
    </>
  );
}
