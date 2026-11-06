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
        <Link href={`/pops/tasks/${id}`}>← {loaded.task.title}</Link>
      </p>
      <h1>{pipeline.name}</h1>
      <p className="pops-lede">
        Copy this into any ChatGPT conversation. It carries the task, previous work and decisions, the playbook (v{playbook.version}),
        permission boundaries and write-back instructions. When ChatGPT replies, paste its <code>pops-report</code> block back on the task page,
        unless it wrote to POps directly.
      </p>
      <div className="pops-actions">
        <CopyButton text={prompt} label="Copy prompt" />
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a>
        <span className="pops-muted pops-small">·</span>
        {includeReview ? (
          <Link className="pops-small" href={`/pops/tasks/${id}/prompt?pipeline=${slug}`}>Without pipeline review</Link>
        ) : (
          <Link className="pops-small" href={`/pops/tasks/${id}/prompt?pipeline=${slug}&review=1`}>Add pipeline review step</Link>
        )}
        <Link className="pops-small" href={`/pops/pipelines/${slug}`}>View pipeline</Link>
      </div>
      <p className="pops-meta">idempotencyKey {idempotencyKey} · {prompt.length.toLocaleString("en-GB")} characters</p>
      <textarea className="pops-prompt" readOnly value={prompt} aria-label="Generated prompt" />
    </>
  );
}
