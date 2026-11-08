import Link from "next/link";
import { notFound } from "next/navigation";
import type { PopsDecision, PopsHistoryKind } from "@prisma/client";
import {
  addNoteAction,
  addSubtaskAction,
  answerDecisionAction,
  linkTaskAction,
  setStatusAction,
  updateTaskAction,
  withdrawDecisionAction,
} from "@/app/pops/actions";
import { CopyButton } from "@/components/pops/CopyButton";
import { ImportReport } from "@/components/pops/ImportReport";
import { RunDetail } from "@/components/pops/RunDetail";
import { siteBaseUrl } from "@/lib/pops/agent-ops";
import { WORKSPACE_KEYS, WORKSPACES } from "@/lib/pops/constants";
import { buildDecisionCopy } from "@/lib/pops/decision-copy";
import { ago, formatDate } from "@/lib/pops/format";
import { getPipelineStats, listPipelines, rankPipelinesForTask } from "@/lib/pops/library";
import { getTaskDetail, listTasks } from "@/lib/pops/tasks";
import { nextStepForTask } from "@/lib/pops/next-step";

type Option = { label: string; explanation?: string };
type Evidence = { title: string; url?: string };

/** History shows what matters by default; routine bookkeeping is one click away. */
const KEY_KINDS: PopsHistoryKind[] = ["agent_run", "decision_answered", "note", "evidence", "status_changed"];

function shortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
}

function StatusForm({ id, status, label, primary = false }: { id: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={primary ? "pops-secondary" : "pops-link-button"}>{label}</button>
    </form>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  return { title: task?.title ?? "Task" };
}

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string; activity?: string; record?: string }>;
}) {
  const { id } = await params;
  const { error, edit, activity, record } = await searchParams;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const now = new Date();
  const editing = edit === "1";
  const [pipelines, stats] = await Promise.all([listPipelines(), getPipelineStats()]);
  const ranked = rankPipelinesForTask(task, pipelines, stats);
  const suggested = ranked.recommended.slice(0, 4);
  const others = [...ranked.recommended.slice(4), ...ranked.other];
  const nextStep = nextStepForTask(task, ranked.recommended.concat(ranked.other));
  const runsById = new Map(task.runs.map((run) => [run.id, run]));
  const pipelineNames = new Map(pipelines.map((p) => [p.slug, p.name]));
  const SUMMARY_CHARS = 140;
  const openDecisions = task.decisions.filter((d) => d.status === "open");
  const recentWork = task.runs.slice(-3).map((r) => `${formatDate(r.createdAt)}: ${r.accomplished.split("\n")[0]}`);
  const workspace = WORKSPACES[task.workspace];
  const isOpen = task.status === "active" || task.status === "paused";
  const showAll = activity === "all";
  const history = showAll ? task.history : task.history.filter((h) => KEY_KINDS.includes(h.kind));
  const hiddenCount = task.history.length - history.length;
  const related = [
    ...task.subtasks.map((s) => ({ id: s.id, title: s.title, note: s.status === "active" ? "subtask" : `subtask, ${s.status}` })),
    ...task.linksFrom.map((l) => ({ id: l.toTask.id, title: l.toTask.title, note: WORKSPACES[l.toTask.workspace].label })),
    ...task.linksTo.map((l) => ({ id: l.fromTask.id, title: l.fromTask.title, note: WORKSPACES[l.fromTask.workspace].label })),
  ];

  const decisionCopy = (d: PopsDecision) =>
    buildDecisionCopy({
      task,
      decision: {
        id: d.id,
        question: d.question,
        recommendation: d.recommendation,
        options: d.options as Option[],
        explanation: d.explanation,
        evidence: d.evidence as Evidence[],
      },
      recentWork,
      baseUrl: siteBaseUrl(),
    });

  return (
    <>
      <p className="pops-crumb">
        <Link href={workspace.path}>{workspace.label}</Link>
        {task.parent ? (
          <>
            {" / "}
            <Link href={`/pops/tasks/${task.parent.id}`}>{task.parent.title}</Link>
          </>
        ) : null}
      </p>
      <h1>{task.title}</h1>
      <div className="pops-taskmeta">
        <span className="pops-meta">
          {task.status === "active" ? "Active" : task.status[0].toUpperCase() + task.status.slice(1)}, last touched {ago(task.lastHumanEngagementAt, now)}
          <span className="pops-tags">
            {task.projectTags.map((tag) => (
              <Link key={tag} href={`/pops?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>
            ))}
          </span>
        </span>
        <span className="pops-actions" style={{ marginTop: 0 }}>
          {isOpen ? (
            <>
              <StatusForm id={task.id} status="completed" label="Mark complete" primary />
              <StatusForm id={task.id} status={task.status === "paused" ? "active" : "paused"} label={task.status === "paused" ? "Resume" : "Pause"} />
              <StatusForm id={task.id} status="archived" label="Archive" />
            </>
          ) : (
            <StatusForm id={task.id} status="active" label="Reopen" primary />
          )}
          {editing ? null : <Link href={`/pops/tasks/${task.id}?edit=1`} className="pops-small pops-muted">Edit</Link>}
        </span>
      </div>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}

      {editing ? (
        <form action={updateTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <label htmlFor="e-title">Title</label>
          <input id="e-title" name="title" defaultValue={task.title} required maxLength={200} style={{ width: "100%" }} />
          <label htmlFor="e-desc">Description</label>
          <textarea id="e-desc" name="description" defaultValue={task.description} maxLength={8000} style={{ minHeight: "8em" }} />
          <label htmlFor="e-next">Suggested next action</label>
          <input id="e-next" name="suggestedNextAction" defaultValue={task.suggestedNextAction} maxLength={500} style={{ width: "100%" }} />
          <div className="pops-inline" style={{ alignItems: "flex-end" }}>
            <div>
              <label htmlFor="e-ws">Workspace</label>
              <select id="e-ws" name="workspace" defaultValue={task.workspace}>
                {WORKSPACE_KEYS.map((key) => <option key={key} value={key}>{WORKSPACES[key].label}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 240px" }}>
              <label htmlFor="e-tags">Project tags, comma separated</label>
              <input id="e-tags" name="tags" defaultValue={task.projectTags.join(", ")} style={{ width: "100%" }} />
            </div>
          </div>
          <fieldset style={{ border: "none", padding: 0, margin: "16px 0 0" }}>
            <legend className="pops-small pops-muted">Recommended pipelines</legend>
            {pipelines.map((p) => (
              <label key={p.slug} className="pops-check pops-check--inline pops-small">
                <input type="checkbox" name="recommendedPipelines" value={p.slug} defaultChecked={task.recommendedPipelines.includes(p.slug)} /> {p.name}
              </label>
            ))}
          </fieldset>
          <div className="pops-actions">
            <button type="submit">Save</button>
            <Link href={`/pops/tasks/${task.id}`}>Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          {isOpen && nextStep ? (
            <section className="pops-guided-next" aria-labelledby="pops-guided-title">
              <p className="pops-small pops-muted pops-guided-eyebrow">Recommended next step</p>
              <h2 id="pops-guided-title">{nextStep.title}</h2>
              <p className="pops-description">{nextStep.description}</p>
              <div className="pops-actions">
                {nextStep.kind === "decision" ? (
                  <a className="pops-button" href="#decisions">{nextStep.label}</a>
                ) : (
                  <Link
                    className="pops-button"
                    href={`/pops/tasks/${task.id}/prompt?pipeline=${nextStep.pipelineSlug}`}
                  >{nextStep.label}</Link>
                )}
                {nextStep.canRecordResult ? <a href={`/pops/tasks/${task.id}?record=1#import-report`} className="pops-guided-secondary">Already implemented? Record the result</a> : null}
              </div>
            </section>
          ) : task.suggestedNextAction ? (
            <p className="pops-nextaction"><strong>Next:</strong> {task.suggestedNextAction}</p>
          ) : null}
          {task.description ? <p className="pops-description">{task.description}</p> : null}

          {openDecisions.length ? (
            <section id="decisions" aria-label="Decisions">
              {openDecisions.map((d) => {
                const options = d.options as Option[];
                const evidence = d.evidence as Evidence[];
                return (
                  <form key={d.id} id={`decision-${d.id}`} action={answerDecisionAction} className="pops-decision">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="decisionId" value={d.id} />
                    <h3 className="pops-question">{d.question}</h3>
                    {d.explanation ? <p className="pops-small pops-muted">{d.explanation}</p> : null}
                    {options.map((o) => (
                      <label key={o.label} className="pops-check">
                        <input type="radio" name="chosenOption" value={o.label} defaultChecked={o.label === d.recommendation} />
                        <span>
                          {o.label}
                          {o.label === d.recommendation ? <span className="pops-recommended"> (recommended)</span> : null}
                          {o.explanation ? <span className="pops-option-note"> — {o.explanation}</span> : null}
                        </span>
                      </label>
                    ))}
                    {evidence.length ? (
                      <p className="pops-small pops-muted" style={{ marginTop: 8 }}>
                        Evidence:{" "}
                        {evidence.map((e, i) => (
                          <span key={i}>
                            {i ? "; " : ""}
                            {e.url && /^https?:\/\//.test(e.url) ? (
                              <a href={e.url} target="_blank" rel="noopener noreferrer nofollow">{e.title}</a>
                            ) : (
                              e.title
                            )}
                          </span>
                        ))}
                      </p>
                    ) : null}
                    <textarea name="response" maxLength={4000} placeholder="Note (optional)" aria-label="Note on this decision" />
                    <div className="pops-actions">
                      <button type="submit">Decide</button>
                      <CopyButton className="pops-link-button" label="Copy for ChatGPT" text={decisionCopy(d)} />
                      <button type="submit" formAction={withdrawDecisionAction} className="pops-link-button">No longer needed</button>
                    </div>
                  </form>
                );
              })}
            </section>
          ) : null}

          {isOpen ? (
            <section aria-labelledby="h-next">
              <h2 id="h-next">Hand it to ChatGPT</h2>
              <ul className="pops-pipelines">
                {suggested.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/pops/tasks/${task.id}/prompt?pipeline=${p.slug}`}>{p.name}</Link>
                  </li>
                ))}
              </ul>
              {others.length ? (
                <details className="pops-more">
                  <summary>Other pipelines</summary>
                  <ul className="pops-pipelines">
                    {others.map((p) => (
                      <li key={p.slug}><Link href={`/pops/tasks/${task.id}/prompt?pipeline=${p.slug}`}>{p.name}</Link></li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <details className="pops-more" id="import-report" open={record === "1"}>
                <summary>Record an agent result (Codex or ChatGPT)</summary>
                <ImportReport taskId={task.id} />
              </details>
            </section>
          ) : null}

          <section aria-labelledby="h-related">
            {related.length ? (
              <>
                <h2 id="h-related">Related tasks</h2>
                <ul className="pops-list pops-list--plain">
                  {related.map((r) => (
                    <li key={r.id}>
                      <div className="pops-row">
                        <Link href={`/pops/tasks/${r.id}`} className="pops-plain">{r.title}</Link>
                        <span className="pops-meta">{r.note}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <RelatedForms taskId={task.id} workspace={task.workspace} excluded={[task.id, ...related.map((r) => r.id)]} />
          </section>
        </>
      )}

      <section id="history" aria-labelledby="h-history">
        <h2 id="h-history">History</h2>
        <ol className="pops-history">
          {history.map((entry) => {
            const run = entry.runId && entry.kind === "agent_run" ? runsById.get(entry.runId) : undefined;
            const detail = (entry.detail ?? {}) as { text?: string; url?: string | null; comments?: string };
            const hasBody = Boolean(run || (detail.text && detail.text !== entry.summary) || detail.url || detail.comments);
            // Run rows are stored with a long summary; display a short, scannable one instead.
            const accomplished = run?.accomplished.replace(/\s+/g, " ").trim() ?? "";
            const truncated = accomplished.length > SUMMARY_CHARS;
            const summary = run
              ? `${(run.pipelineSlug && pipelineNames.get(run.pipelineSlug)) || "Agent run"}${run.outcome !== "completed" ? ` (${run.outcome})` : ""}: ${truncated ? `${accomplished.slice(0, SUMMARY_CHARS).replace(/\s\S*$/, "")}…` : accomplished}`
              : entry.summary;
            const head = (
              <>
                <span className="pops-when">
                  {shortDate(entry.createdAt)}
                  {entry.actor === "agent" ? <span className="pops-who">agent</span> : null}
                </span>
                <span className="pops-summary">{summary}</span>
              </>
            );
            return (
              <li key={entry.id} id={run ? `run-${run.id}` : undefined}>
                {hasBody ? (
                  <details>
                    <summary>{head}</summary>
                    <div className="pops-entry-body">
                      {run ? <RunDetail run={run} taskId={task.id} showAccomplished={truncated} /> : null}
                      {!run && detail.text && detail.text !== entry.summary ? <p className="pops-description">{detail.text}</p> : null}
                      {detail.url && /^(https?|obsidian):\/\//.test(detail.url) ? (
                        <p><a href={detail.url} target="_blank" rel="noopener noreferrer nofollow">{detail.url}</a></p>
                      ) : null}
                      {detail.comments ? <p className="pops-description">{detail.comments}</p> : null}
                    </div>
                  </details>
                ) : (
                  <div className="pops-entry-plain">{head}</div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="pops-actions">
          {hiddenCount > 0 ? (
            <Link href={`/pops/tasks/${task.id}?activity=all#history`} className="pops-small">Show all activity ({hiddenCount} more)</Link>
          ) : showAll ? (
            <Link href={`/pops/tasks/${task.id}#history`} className="pops-small">Show key events only</Link>
          ) : null}
        </div>
        <details className="pops-more">
          <summary>Add a note or link</summary>
          <form action={addNoteAction} aria-label="Add a note or evidence">
            <input type="hidden" name="id" value={task.id} />
            <textarea name="text" maxLength={4000} aria-label="Note" placeholder="Feedback, context or evidence" />
            <div className="pops-inline" style={{ marginTop: 8 }}>
              <input type="url" name="url" placeholder="Optional link (https:// or obsidian://)" aria-label="Link" />
              <button type="submit" className="pops-secondary">Add</button>
            </div>
          </form>
        </details>
      </section>
    </>
  );
}

async function RelatedForms({ taskId, workspace, excluded }: { taskId: string; workspace: string; excluded: string[] }) {
  const linkable = (await listTasks({ statuses: ["active", "paused"] })).filter((t) => !excluded.includes(t.id));
  return (
    <details className="pops-more">
      <summary>Add a subtask or link a task</summary>
      <form action={addSubtaskAction} className="pops-inline">
        <input type="hidden" name="parentId" value={taskId} />
        <input type="hidden" name="workspace" value={workspace} />
        <input name="title" placeholder="Subtask" required maxLength={200} aria-label="Subtask title" />
        <button type="submit" className="pops-secondary">Add subtask</button>
      </form>
      {linkable.length ? (
        <form action={linkTaskAction} className="pops-inline" style={{ marginTop: 8 }}>
          <input type="hidden" name="id" value={taskId} />
          <select name="targetId" required aria-label="Task to link" defaultValue="" style={{ flex: "1 1 240px" }}>
            <option value="" disabled>Link to another task…</option>
            {linkable.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button type="submit" className="pops-secondary">Link</button>
        </form>
      ) : null}
    </details>
  );
}
