import { agentOps } from "@/lib/pops/agent-ops";
import { json, readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

export const POST = withAgent(async (principal, request) => {
  const result = await agentOps.propose(principal, await readJsonBody(request));
  return json(result, result.duplicate ? 200 : 201);
});
