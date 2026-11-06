import { agentOps } from "@/lib/pops/agent-ops";
import { withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const GET = withAgent<Context>(async (principal, _request, { params }) => {
  const { taskId } = await params;
  return agentOps.getTask(principal, taskId);
});
