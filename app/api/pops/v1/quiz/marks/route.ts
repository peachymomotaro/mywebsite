import { requireScope } from "@/lib/pops/agent-ops";
import { json, withAgent } from "@/lib/pops/http";
import { listQuizMarks } from "@/lib/pops/quiz";

export const dynamic = "force-dynamic";

/** Marks changed after `since` (ISO time), oldest first. Page with `next`. */
export const GET = withAgent(async (principal, request) => {
  requireScope(principal, "quiz:read");
  const params = new URL(request.url).searchParams;
  const sinceRaw = params.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  if (since && Number.isNaN(since.getTime())) return json({ error: "invalid_request", message: "since must be an ISO time" }, 400);
  const limit = Number(params.get("limit") ?? 500);
  return listQuizMarks({ since, limit: Number.isFinite(limit) ? limit : 500 });
});
