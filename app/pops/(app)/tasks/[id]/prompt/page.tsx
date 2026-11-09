import { randomBytes } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/pops/CopyButton";
import { siteBaseUrl } from "@/lib/pops/agent-ops";
import { getCurrentPlaybook, loadPromptContext, loadPromptPipeline } from "@/lib/pops/context";
import { buildPipelinePrompt, buildTaskBrief, newIdempotencyKey } from "@/lib/pops/prompt";

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
  const [loaded, pipeline, playbook] = await Promise.all([
    loadPromptContext(id),
    slug ? loadPromptPipeline(slug) : Promise.resolve(null),
    slug ? getCurrentPlaybook() : Promise.resolve(null),
  ]);
  if (!loaded || (slug && !pipeline)) notFound();

  const includeReview = review === "1";
  const idempotencyKey = slug ? newIdempotencyKey(id, slug, randomBytes(4).toString("hex")) : null;
  const prompt = pipeline && playbook && idempotencyKey
    ? buildPipelinePrompt({ context: loaded.context, pipeline, playbook, idempotencyKey, apiBaseUrl: siteBaseUrl(), includePipelineReview: includeReview })
    : buildTaskBrief(loaded.context, siteBaseUrl());

  return (
    <>
      <p className="pops-small pops-muted">
        <Link href={`/pops/tasks/${id}`}>Back to {loaded.task.title}</Link>
      </p>
      <h1>{pipeline ? `${pipeline.name} workflow` : "Task status"}</h1>
      <p className="pops-lede">
        {pipeline
          ? "This handoff attaches the selected workflow to the task's status, with the existing safety boundaries and reporting instructions."
          : "Copy this task status into any agent, then add your own instructions. It records progress and decisions but does not direct the agent to perform a workflow."}
      </p>
      <div className="pops-actions">
        <CopyButton text={prompt} label={pipeline ? "Copy task + workflow" : "Copy task status"} />
        {pipeline ? <Link href={`/pops/tasks/${id}/prompt`}>Use task status only</Link> : <Link href={`/pops/tasks/${id}#h-next`}>Choose a workflow</Link>}
      </div>
      <details className="pops-more" style={{ marginTop: 28 }}>
        <summary>Read the {pipeline ? "complete handoff" : "task status"} ({prompt.length.toLocaleString("en-GB")} characters)</summary>
        <textarea className="pops-prompt" readOnly value={prompt} aria-label="Generated prompt" />
      </details>
      {pipeline ? (
        <p className="pops-small pops-muted pops-actions">
          {includeReview ? (
            <>Includes a pipeline review step. <Link href={`/pops/tasks/${id}/prompt?pipeline=${slug}`}>Remove it</Link></>
          ) : (
            <Link href={`/pops/tasks/${id}/prompt?pipeline=${slug}&review=1`}>Also ask the agent to review this workflow</Link>
          )}
          <Link href={`/pops/pipelines/${slug}`}>Edit workflow</Link>
        </p>
      ) : null}
    </>
  );
}
