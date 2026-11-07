import Link from "next/link";
import { createPipelineAction, reviewProposalAction } from "@/app/pops/actions";
import { PipelineFields } from "@/components/pops/PipelineFields";
import { getProposal } from "@/lib/pops/library";

export const metadata = { title: "New pipeline" };

export default async function NewPipelinePage({ searchParams }: { searchParams: Promise<{ proposal?: string; error?: string }> }) {
  const { proposal: proposalId, error } = await searchParams;
  const proposal = proposalId ? await getProposal(proposalId) : null;
  const applying = proposal && proposal.status === "pending" && proposal.kind === "new_pipeline" ? proposal : null;

  return (
    <>
      <p className="pops-small pops-muted"><Link href="/pops/pipelines">All pipelines</Link></p>
      <h1>New pipeline</h1>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}
      <form action={createPipelineAction}>
        {applying ? (
          <>
            <input type="hidden" name="proposalId" value={applying.id} />
            <div className="pops-proposal">
              <h3>From an agent proposal</h3>
              {applying.rationale ? <p className="pops-small">{applying.rationale}</p> : null}
            </div>
          </>
        ) : null}
        <label htmlFor="p-slug">Slug</label>
        <input id="p-slug" name="slug" required pattern="[a-z0-9][a-z0-9-]{2,59}" placeholder="learn-something-useful" />
        <PipelineFields
          values={{ name: applying?.title ?? "", summary: "", workspace: null, instructions: applying?.body ?? "", expectedEvidence: "" }}
        />
        <div className="pops-actions"><button type="submit">Create pipeline</button></div>
      </form>
      {applying ? (
        <form action={reviewProposalAction}>
          <input type="hidden" name="proposalId" value={applying.id} />
          <input type="hidden" name="decision" value="reject" />
          <input type="hidden" name="back" value="/pops/pipelines" />
          <button type="submit" className="pops-link-button">Reject this proposal</button>
        </form>
      ) : null}
    </>
  );
}
