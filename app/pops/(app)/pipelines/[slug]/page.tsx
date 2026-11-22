import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePipelineAction, reviewProposalAction, savePipelineAction } from "@/app/pops/actions";
import { PipelineFields } from "@/components/pops/PipelineFields";
import { DeletePipelineControl } from "@/components/pops/DeletePipelineControl";
import { WORKSPACES } from "@/lib/pops/constants";
import { formatDateTime } from "@/lib/pops/format";
import { getPipeline, getPipelineStats, getProposal, isSystemPipeline, listSupersededPipelineProposals } from "@/lib/pops/library";

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
  const retired = await listSupersededPipelineProposals(pipeline.id);
  const proposal = proposalId ? await getProposal(proposalId) : null;
  const applying = proposal && proposal.status === "pending" && proposal.pipelineId === pipeline.id ? proposal : null;
  const editing = edit === "1" || Boolean(applying);
  const stats = (await getPipelineStats()).get(slug);
  const back = `/pops/pipelines/${slug}`;

  return (
    <>
      <p className="pops-small pops-muted"><Link href="/pops/pipelines">All pipelines</Link></p>
      <div className="pops-pagehead">
        <h1>{pipeline.name}</h1>
        {!editing ? <Link href={`${back}?edit=1`}>Edit</Link> : null}
      </div>
      <p className="pops-lede">
        {pipeline.summary}
        <br />
        <span className="pops-small">
          For {pipeline.workspace ? WORKSPACES[pipeline.workspace].label : "any workspace"}, version {pipeline.currentVersion}.
          {stats ? ` Used ${stats.runs} ${stats.runs === 1 ? "time" : "times"}, ${stats.useful} marked useful, ${stats.notUseful} not.` : ""}
          {pipeline.archived ? " Archived." : ""}
        </span>
      </p>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}

      {editing ? (
        <form action={savePipelineAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="baseVersion" value={pipeline.currentVersion} />
          {pipeline.proposals.length ? (
            <section className="pops-proposal" aria-labelledby="review-proposals">
              <h2 id="review-proposals">Changes to {pipeline.name} ({pipeline.slug})</h2>
              <p className="pops-small pops-muted">
                Choose what this version includes. Obsolete suggestions can be marked replaced; other suggestions stay pending.
                Nothing is applied until you edit the instructions and save.
              </p>
              {pipeline.proposals.map((p) => (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <label htmlFor={`resolution-${p.id}`}><strong>{p.title}</strong></label>
                  {p.rationale ? <p className="pops-small">{p.rationale.slice(0, 230)}{p.rationale.length > 230 ? "…" : ""}</p> : null}
                  {retired.some((old) => old.supersededById === p.id) ? (
                    <p className="pops-small pops-muted">
                      Replaces: {retired.filter((old) => old.supersededById === p.id).map((old) => old.title).join("; ")}
                    </p>
                  ) : null}
                  {p.baseVersion && p.baseVersion !== pipeline.currentVersion
                    ? <p className="pops-small pops-error">Suggested against v{p.baseVersion}; compare with current v{pipeline.currentVersion} before applying.</p>
                    : null}
                  <select
                    id={`resolution-${p.id}`}
                    name={`proposalResolution:${p.id}`}
                    defaultValue={p.id === applying?.id ? "include" : "keep"}
                    aria-label={`How to resolve: ${p.title}`}
                  >
                    <option value="keep">Keep for later</option>
                    <option value="include">Include in this version</option>
                    <option value="supersede">Replaced by this version</option>
                  </select>
                  <details className="pops-more"><summary>Read proposed change</summary><div className="pops-pre">{p.body}</div></details>
                </div>
              ))}
            </section>
          ) : null}
          <PipelineFields values={{ ...pipeline, instructions: current.instructions, expectedEvidence: current.expectedEvidence }} currentInstructions={current.instructions} />
          <div className="pops-actions">
            <button type="submit">Save as v{pipeline.currentVersion + 1}</button>
            <Link href={back}>Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          <div className="pops-pre">{current.instructions}</div>
          {current.expectedEvidence ? <p className="pops-small pops-muted" style={{ marginTop: 12 }}>Expected evidence: {current.expectedEvidence}</p> : null}
        </>
      )}

      {pipeline.proposals.length && !editing ? (
        <section aria-labelledby="h-proposals">
          <h2 id="h-proposals">Suggested changes ({pipeline.proposals.length})</h2>
          <p className="pops-small">Target: {pipeline.name} ({pipeline.slug}). Review them together, then save one new version.</p>
          <Link href={`${back}?edit=1`}>Review suggestions</Link>
          <details className="pops-more">
            <summary>Individual suggestions</summary>
            {pipeline.proposals.map((p) => (
              <div key={p.id} className="pops-proposal">
                <strong>{p.title}</strong>
                <div className="pops-actions">
                  <Link href={`${back}?proposal=${p.id}`}>Review this one</Link>
                  <form action={reviewProposalAction}>
                    <input type="hidden" name="proposalId" value={p.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className="pops-link-button">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </details>
        </section>
      ) : null}

      {retired.length ? (
        <details className="pops-more">
          <summary>Superseded suggestions ({retired.length}) — history only</summary>
          <ul className="pops-list">
            {retired.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>
                <p className="pops-small pops-muted">{p.reviewNote}{p.supersededById ? ` · Replacement: ${p.supersededById}` : ""}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <details className="pops-more" style={{ marginTop: 32 }}>
        <summary>Version history ({pipeline.versions.length})</summary>
        <ol className="pops-history">
          {pipeline.versions.map((v) => (
            <li key={v.id}>
              <details>
                <summary>
                  <span className="pops-when">v{v.version}</span>
                  <span className="pops-summary">
                    {v.changeNote} <span className="pops-meta">{formatDateTime(v.createdAt)}{v.author === "system" ? ", initial template" : ""}</span>
                  </span>
                </summary>
                <div className="pops-entry-body"><div className="pops-pre">{v.instructions}</div></div>
              </details>
            </li>
          ))}
        </ol>
      </details>

      <div className="pops-actions">
        <form action={archivePipelineAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="archived" value={pipeline.archived ? "false" : "true"} />
          <button type="submit" className="pops-link-button pops-small">{pipeline.archived ? "Restore this pipeline" : "Archive this pipeline"}</button>
        </form>
        {!isSystemPipeline(pipeline.slug) && !pipeline.versions.some((v) => v.version === 1 && v.author === "system") ? <DeletePipelineControl id={pipeline.id} name={pipeline.name} /> : null}
      </div>
    </>
  );
}
