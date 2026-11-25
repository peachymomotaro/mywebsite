import { agentOps } from "@/lib/pops/agent-ops";
import { readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const POST = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  return agentOps.setTaskStatus(principal, taskId, await readJsonBody(request));
});
