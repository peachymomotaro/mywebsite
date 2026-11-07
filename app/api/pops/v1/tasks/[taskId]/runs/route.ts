import { agentOps } from "@/lib/pops/agent-ops";
import { json, readJsonBody, withAgent } from "@/lib/pops/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ taskId: string }> };

/** Idempotent: replaying the same idempotencyKey and report returns 200 with duplicate: true. */
export const POST = withAgent<Context>(async (principal, request, { params }) => {
  const { taskId } = await params;
  const body = await readJsonBody(request);
  const report = body && typeof body === "object" && "report" in body ? body.report : body;
  const result = await agentOps.recordRun(principal, taskId, report, "api");
  return json(result, result.duplicate ? 200 : 201);
});
