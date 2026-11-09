import { agentOps } from "@/lib/pops/agent-ops";
import { withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const GET = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  const pipeline = new URL(request.url).searchParams.get("pipeline");
  return pipeline ? agentOps.getPipelinePrompt(principal, taskId, pipeline) : agentOps.getTaskBrief(principal, taskId);
});
