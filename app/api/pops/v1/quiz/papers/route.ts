import { requireScope } from "@/lib/pops/agent-ops";
import { readJsonBody, withAgent } from "@/lib/pops/http";
import { quizUploadSchema, upsertQuizPapers } from "@/lib/pops/quiz";

export const dynamic = "force-dynamic";

/** Quiz Trainer uploads parsed papers here. Existing marks are never touched. */
export const POST = withAgent(async (principal, request) => {
  requireScope(principal, "quiz:write");
  const { papers } = quizUploadSchema.parse(await readJsonBody(request));
  return upsertQuizPapers(papers);
});
