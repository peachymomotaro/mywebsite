import { agentOps } from "@/lib/pops/agent-ops";
import { json, readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const POST = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  const result = await agentOps.createDecision(principal, taskId, await readJsonBody(request));
  return json(result, result.duplicate ? 200 : 201);
});
