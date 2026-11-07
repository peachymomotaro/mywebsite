import Link from "next/link";
import { reviewProposalAction, savePlaybookAction } from "@/app/pops/actions";
import { FOUNDATIONAL_BOUNDARIES } from "@/lib/pops/constants";
import { formatDateTime } from "@/lib/pops/format";
import { getCurrentPlaybook, getProposal, listPlaybookVersions, listProposals } from "@/lib/pops/library";

export const metadata = { title: "Playbook" };

const KIND_LABEL: Record<string, string> = { playbook_observation: "Observation", playbook_change: "Proposed change" };

export default async function PlaybookPage({ searchParams }: { searchParams: Promise<{ edit?: string; proposal?: string; error?: string }> }) {
  const { edit, proposal: proposalId, error } = await searchParams;
  const [current, versions, pending] = await Promise.all([getCurrentPlaybook(), listPlaybookVersions(), listProposals("pending")]);
  const proposals = pending.filter((p) => p.kind === "playbook_change" || p.kind === "playbook_observation");
  const proposal = proposalId ? await getProposal(proposalId) : null;
  const applying = proposal && proposal.status === "pending" && proposal.kind.startsWith("playbook") ? proposal : null;
  const editing = edit === "1" || Boolean(applying);

  return (
    <>
      <div className="pops-pagehead">
        <h1>Playbook</h1>
        {!editing ? <Link href="/pops/playbook?edit=1">Edit</Link> : null}
      </div>
      <p className="pops-lede">Shared instructions included in every prompt. Agents can suggest changes; only you can apply them.</p>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}
      {proposals.length && !editing ? (
        <section>
          <h2 style={{ marginTop: 24 }}>Suggested by agents</h2>
          {proposals.map((p) => (
          <div key={p.id} className="pops-proposal">
            <h3>{p.title}</h3>
            <p className="pops-meta">{KIND_LABEL[p.kind]}{p.task ? `, from ${p.task.title}` : ""}</p>
            <p className="pops-description pops-small">{p.body.length > 800 ? `${p.body.slice(0, 800)}…` : p.body}</p>
            {p.rationale ? <p className="pops-small pops-muted">{p.rationale}</p> : null}
            <div className="pops-actions">
              <Link href={`/pops/playbook?proposal=${p.id}`}>Apply in editor</Link>
              <form action={reviewProposalAction}>
                <input type="hidden" name="proposalId" value={p.id} />
                <input type="hidden" name="decision" value="accept" />
                <input type="hidden" name="reviewNote" value="Noted without changing the playbook" />
                <button type="submit" className="pops-link-button">Mark noted</button>
              </form>
              <form action={reviewProposalAction}>
                <input type="hidden" name="proposalId" value={p.id} />
                <input type="hidden" name="decision" value="reject" />
                <button type="submit" className="pops-link-button">Reject</button>
              </form>
            </div>
          </div>
          ))}
        </section>
      ) : null}

      {editing ? (
        <form action={savePlaybookAction}>
          <input type="hidden" name="baseVersion" value={current.version} />
          {applying ? (
            <div className="pops-proposal">
              <input type="hidden" name="proposalId" value={applying.id} />
              <h3>Applying: {applying.title}</h3>
              {applying.rationale ? <p className="pops-small">{applying.rationale}</p> : null}
              <div className="pops-pre">{applying.body}</div>
              <p className="pops-small pops-muted">Merge what you agree with into the text below. Nothing changes until you save.</p>
            </div>
          ) : null}
          <label htmlFor="pb-content">Playbook (Markdown) — editing v{current.version}</label>
          <textarea id="pb-content" name="content" defaultValue={current.content} className="pops-code" style={{ minHeight: "32em" }} required />
          <label htmlFor="pb-note">Change note</label>
          <input id="pb-note" name="changeNote" maxLength={300} style={{ width: "100%" }} />
          <div className="pops-actions">
            <button type="submit">Save as v{current.version + 1}</button>
            <Link href="/pops/playbook">Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          <div className="pops-pre">{current.content}</div>
        </>
      )}

      <details className="pops-more" style={{ marginTop: 32 }}>
        <summary>Permission boundaries that always apply ({FOUNDATIONAL_BOUNDARIES.length})</summary>
        <div className="pops-boundaries">
          <p className="pops-small pops-muted">Set in code and placed after the playbook in every prompt, so playbook edits cannot weaken them.</p>
          <ul>{FOUNDATIONAL_BOUNDARIES.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      </details>
      <details className="pops-more">
        <summary>Version history ({versions.length})</summary>
        <ol className="pops-history">
          {versions.map((v) => (
            <li key={v.id}>
              <details>
                <summary>
                  <span className="pops-when">v{v.version}</span>
                  <span className="pops-summary">
                    {v.changeNote}{v.proposalId ? " (from an agent suggestion)" : ""} <span className="pops-meta">{formatDateTime(v.createdAt)}</span>
                  </span>
                </summary>
                <div className="pops-entry-body"><div className="pops-pre">{v.content}</div></div>
              </details>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
