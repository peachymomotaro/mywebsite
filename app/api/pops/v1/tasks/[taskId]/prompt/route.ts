import { agentOps } from "@/lib/pops/agent-ops";
import { json, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

export const GET = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  const pipeline = new URL(request.url).searchParams.get("pipeline");
  if (!pipeline) return json({ error: "invalid_request", message: "pipeline query parameter is required" }, 400);
  return agentOps.getPipelinePrompt(principal, taskId, pipeline);
});
