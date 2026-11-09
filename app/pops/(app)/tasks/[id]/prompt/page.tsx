import { randomBytes } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/pops/CopyButton";
import { siteBaseUrl } from "@/lib/pops/agent-ops";
import { getCurrentPlaybook, loadPromptContext, loadPromptPipeline } from "@/lib/pops/context";
import { buildPipelinePrompt, newIdempotencyKey } from "@/lib/pops/prompt";

export const metadata = { title: "Prompt" };

export default async function PromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pipeline?: string; review?: string }>;
}) {
  const { id } = await params;
  const { pipeline: slug, review } = await searchParams;
  if (!slug) notFound();
  const [loaded, pipeline, playbook] = await Promise.all([loadPromptContext(id), loadPromptPipeline(slug), getCurrentPlaybook()]);
  if (!loaded || !pipeline) notFound();

  const includeReview = review === "1";
  const isImplementation = slug === "work-implement-change";
  const idempotencyKey = newIdempotencyKey(id, slug, randomBytes(4).toString("hex"));
  const prompt = buildPipelinePrompt({
    context: loaded.context,
    pipeline,
    playbook,
    idempotencyKey,
    apiBaseUrl: siteBaseUrl(),
    includePipelineReview: includeReview,
  });

  return (
    <>
      <p className="pops-small pops-muted">
        <Link href={`/pops/tasks/${id}`}>Back to {loaded.task.title}</Link>
      </p>
      <h1>{pipeline.name}</h1>
      <p className="pops-lede">
        {isImplementation
          ? "Copy the full handoff into your coding agent. It includes the existing plan, recorded decisions, and safety boundaries. When the agent finishes, record the PR and results on this task."
          : "Copy this into your agent. When it replies, record its report on this task."}
      </p>
      <div className="pops-actions">
        <CopyButton text={prompt} label={isImplementation ? "Copy agent handoff" : "Copy prompt"} />
      </div>
      <details className="pops-more" style={{ marginTop: 28 }}>
        <summary>Read the prompt ({prompt.length.toLocaleString("en-GB")} characters)</summary>
        <textarea className="pops-prompt" readOnly value={prompt} aria-label="Generated prompt" />
      </details>
      <p className="pops-small pops-muted pops-actions">
        {includeReview ? (
          <>Includes a pipeline review step. <Link href={`/pops/tasks/${id}/prompt?pipeline=${slug}`}>Remove it</Link></>
        ) : (
          <Link href={`/pops/tasks/${id}/prompt?pipeline=${slug}&review=1`}>Also ask the agent to review this pipeline</Link>
        )}
        <Link href={`/pops/pipelines/${slug}`}>Edit pipeline</Link>
      </p>
    </>
  );
}
