import { agentOps } from "@/lib/pops/agent-ops";
import { readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const GET = withAgent<Context>(async (principal, _request, { params }) => {
  const { taskId } = await params;
  return agentOps.getTask(principal, taskId);
});

export const PATCH = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  return agentOps.updateTask(principal, taskId, await readJsonBody(request));
});
