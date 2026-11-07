import { agentOps } from "@/lib/pops/agent-ops";
import { json, readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

export const GET = withAgent(async (principal, request) => {
  const params = new URL(request.url).searchParams;
  return agentOps.listTasks(principal, {
    workspace: params.get("workspace") ?? undefined,
    status: params.get("status") ?? undefined,
    tag: params.get("tag") ?? undefined,
  });
});

export const POST = withAgent(async (principal, request) => {
  const result = await agentOps.createTask(principal, await readJsonBody(request));
  return json(result, result.duplicate ? 200 : 201);
});
