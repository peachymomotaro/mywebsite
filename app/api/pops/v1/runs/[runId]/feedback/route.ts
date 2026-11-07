import { agentOps } from "@/lib/pops/agent-ops";
import { readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ runId: string }> };

/** Feedback relayed by an agent from Peter's own words; marked as relayed. */
export const POST = withAgent<Context>(async (principal, request, { params }) => {
  const { runId } = await params;
  return agentOps.recordFeedback(principal, runId, await readJsonBody(request));
});
