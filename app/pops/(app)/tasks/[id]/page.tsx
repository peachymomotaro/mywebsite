import Link from "next/link";
import { notFound } from "next/navigation";
import type { PopsDecision } from "@prisma/client";
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
import { TASK_STATUSES, WORKSPACE_KEYS, WORKSPACES } from "@/lib/pops/constants";
import { buildDecisionCopy } from "@/lib/pops/decision-copy";
import { ago, formatDate, formatDateTime } from "@/lib/pops/format";
import { getPipelineStats, listPipelines, rankPipelinesForTask } from "@/lib/pops/library";
import { getTaskDetail, listTasks } from "@/lib/pops/tasks";

type Option = { label: string; explanation?: string };
type Evidence = { title: string; url?: string };

const STATUS_VERBS: Record<string, string> = {
  active: "Reactivate",
  paused: "Pause",
  completed: "Mark complete",
  archived: "Archive",
};

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
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { error, edit } = await searchParams;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const now = new Date();
  const [pipelines, stats, linkable] = await Promise.all([
    listPipelines(),
    getPipelineStats(),
    listTasks({ statuses: ["active", "paused"] }),
  ]);
  const ranked = rankPipelinesForTask(task, pipelines, stats);
  const runsById = new Map(task.runs.map((run) => [run.id, run]));
  const decisionsById = new Map(task.decisions.map((d) => [d.id, d]));
  const openDecisions = task.decisions.filter((d) => d.status === "open");
  const recentWork = task.runs.slice(-3).map((r) => `${formatDate(r.createdAt)}: ${r.accomplished.split("\n")[0]}`);
  const workspace = WORKSPACES[task.workspace];
  const linkedIds = new Set([task.id, ...task.linksFrom.map((l) => l.toTaskId), ...task.linksTo.map((l) => l.fromTaskId)]);

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
      <p className="pops-small pops-muted">
        <Link href={workspace.path}>{workspace.label}</Link>
        {task.parent ? (
          <>
            {" › "}
            <Link href={`/pops/tasks/${task.parent.id}`}>{task.parent.title}</Link>
          </>
        ) : null}
      </p>
      <h1>{task.title}</h1>
      <p className="pops-meta">
        {task.status} · created {formatDate(task.createdAt)}{task.createdBy === "agent" ? " by an agent" : ""} · last engaged{" "}
        {ago(task.lastHumanEngagementAt, now)}
        {task.projectTags.map((tag) => (
          <Link key={tag} href={`/pops?tag=${encodeURIComponent(tag)}`} className="pops-tag"> #{tag}</Link>
        ))}
      </p>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}

      <div className="pops-detail">
        <div>
          {task.suggestedNextAction ? (
            <p className="pops-nextaction"><strong>Next:</strong> {task.suggestedNextAction}</p>
          ) : null}
          {task.description ? <p className="pops-description">{task.description}</p> : null}

          {task.decisions.length ? (
            <section id="decisions" aria-labelledby="h-decisions">
              <h2 id="h-decisions">Decisions</h2>
              {openDecisions.map((d) => {
                const options = d.options as Option[];
                const evidence = d.evidence as Evidence[];
                return (
                  <article key={d.id} id={`decision-${d.id}`} className="pops-decision">
                    <h3>{d.question}</h3>
                    <ol>
                      {options.map((o) => (
                        <li key={o.label}>
                          {o.label}
                          {o.label === d.recommendation ? <span className="pops-recommended">recommended</span> : null}
                          {o.explanation ? <span className="pops-muted"> — {o.explanation}</span> : null}
                        </li>
                      ))}
                    </ol>
                    {d.explanation ? <p className="pops-small">{d.explanation}</p> : null}
                    {evidence.length ? (
                      <p className="pops-small">
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
                    <form action={answerDecisionAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="decisionId" value={d.id} />
                      <div className="pops-inline">
                        {options.map((o) => (
                          <label key={o.label} className="pops-check">
                            <input type="radio" name="chosenOption" value={o.label} defaultChecked={o.label === d.recommendation} /> {o.label}
                          </label>
                        ))}
                      </div>
                      <label htmlFor={`resp-${d.id}`}>Response (optional)</label>
                      <textarea id={`resp-${d.id}`} name="response" maxLength={4000} style={{ minHeight: "3.5em" }} />
                      <div className="pops-actions">
                        <button type="submit">Record decision</button>
                        <CopyButton className="pops-button" label="Copy for ChatGPT" text={decisionCopy(d)} />
                      </div>
                    </form>
                    <form action={withdrawDecisionAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="decisionId" value={d.id} />
                      <button type="submit" className="pops-link-button pops-small">Withdraw — no longer needed</button>
                    </form>
                  </article>
                );
              })}
              {task.decisions
                .filter((d) => d.status !== "open")
                .map((d) => (
                  <details key={d.id} id={`decision-${d.id}`} className="pops-decision pops-decision--closed">
                    <summary>
                      {d.question} — <strong>{d.status === "withdrawn" ? "withdrawn" : d.chosenOption || "answered"}</strong>
                    </summary>
                    {d.response ? <p className="pops-description">{d.response}</p> : null}
                    {d.answeredAt ? <p className="pops-meta">{formatDateTime(d.answeredAt)}</p> : null}
                  </details>
                ))}
            </section>
          ) : null}

          <section className="pops-section" aria-labelledby="h-import">
            <h2 id="h-import">Agent report</h2>
            <p className="pops-small pops-muted">
              Agents with POps access write back directly. Otherwise ChatGPT ends its reply with a <code>pops-report</code> block — paste it here.
            </p>
            <ImportReport taskId={task.id} />
          </section>

          <section className="pops-section" id="history" aria-labelledby="h-history">
            <h2 id="h-history">History</h2>
            <ol className="pops-history">
              {task.history.map((entry) => {
                const run = entry.runId && entry.kind === "agent_run" ? runsById.get(entry.runId) : undefined;
                const decision = entry.decisionId ? decisionsById.get(entry.decisionId) : undefined;
                const detail = (entry.detail ?? {}) as { text?: string; url?: string | null; comments?: string };
                const hasBody = Boolean(run || (detail.text && detail.text !== entry.summary) || detail.url || detail.comments || decision?.response);
                const head = (
                  <>
                    <span className="pops-meta">{formatDateTime(entry.createdAt)}</span>
                    <span className="pops-kind" data-actor={entry.actor}>{entry.kind.replace("_", " ")}</span>
                    <span>{entry.summary}</span>
                  </>
                );
                return (
                  <li key={entry.id} id={run ? `run-${run.id}` : undefined}>
                    {hasBody ? (
                      <details>
                        <summary>{head}</summary>
                        <div className="pops-entry-body">
                          {run ? <RunDetail run={run} taskId={task.id} /> : null}
                          {!run && detail.text ? <p className="pops-description">{detail.text}</p> : null}
                          {detail.url && /^(https?|obsidian):\/\//.test(detail.url) ? (
                            <p><a href={detail.url} target="_blank" rel="noopener noreferrer nofollow">{detail.url}</a></p>
                          ) : null}
                          {detail.comments ? <p className="pops-description">{detail.comments}</p> : null}
                          {!run && decision?.response && entry.kind === "decision_answered" ? <p className="pops-description">{decision.response}</p> : null}
                        </div>
                      </details>
                    ) : (
                      <div className="pops-entry-plain">{head}</div>
                    )}
                  </li>
                );
              })}
            </ol>

            <form action={addNoteAction} aria-label="Add a note or evidence">
              <input type="hidden" name="id" value={task.id} />
              <label htmlFor="note-text">Add a note, feedback or evidence</label>
              <textarea id="note-text" name="text" maxLength={4000} style={{ minHeight: "3.5em" }} />
              <div className="pops-inline">
                <input type="url" name="url" placeholder="Optional link (https:// or obsidian://)" aria-label="Link" style={{ flex: "1 1 260px" }} />
                <button type="submit" className="pops-secondary">Add to history</button>
              </div>
            </form>
          </section>
        </div>

        <aside>
          <h2>Status</h2>
          <div className="pops-actions">
            {TASK_STATUSES.filter((s) => s !== task.status).map((status) => (
              <form key={status} action={setStatusAction}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="status" value={status} />
                <button type="submit" className={status === "completed" ? undefined : "pops-secondary"}>{STATUS_VERBS[status]}</button>
              </form>
            ))}
          </div>

          <h2>Run a pipeline</h2>
          <ul className="pops-plainlist pops-pipelines">
            {ranked.recommended.map((p) => (
              <li key={p.slug}>
                <Link href={`/pops/tasks/${task.id}/prompt?pipeline=${p.slug}`}>{p.name}</Link>
                {task.recommendedPipelines.includes(p.slug) ? <span className="pops-flag">recommended</span> : null}
              </li>
            ))}
          </ul>
          <details>
            <summary className="pops-small pops-muted">Other pipelines</summary>
            <ul className="pops-plainlist pops-pipelines">
              {ranked.other.map((p) => (
                <li key={p.slug}><Link href={`/pops/tasks/${task.id}/prompt?pipeline=${p.slug}`}>{p.name}</Link></li>
              ))}
            </ul>
          </details>

          <h2>Subtasks</h2>
          {task.subtasks.length ? (
            <ul className="pops-plainlist">
              {task.subtasks.map((s) => (
                <li key={s.id}>
                  <Link href={`/pops/tasks/${s.id}`}>{s.title}</Link> <span className="pops-status" data-status={s.status}>{s.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <form action={addSubtaskAction} className="pops-inline" style={{ marginTop: 8 }}>
            <input type="hidden" name="parentId" value={task.id} />
            <input type="hidden" name="workspace" value={task.workspace} />
            <input name="title" placeholder="Add a subtask" required maxLength={200} aria-label="Subtask title" />
            <button type="submit" className="pops-secondary">Add</button>
          </form>

          <h2>Related</h2>
          {task.linksFrom.length || task.linksTo.length ? (
            <ul className="pops-plainlist">
              {task.linksFrom.map((l) => (
                <li key={l.id}><Link href={`/pops/tasks/${l.toTask.id}`}>{l.toTask.title}</Link> <span className="pops-ws">{WORKSPACES[l.toTask.workspace].label}</span></li>
              ))}
              {task.linksTo.map((l) => (
                <li key={l.id}><Link href={`/pops/tasks/${l.fromTask.id}`}>{l.fromTask.title}</Link> <span className="pops-ws">{WORKSPACES[l.fromTask.workspace].label}</span></li>
              ))}
            </ul>
          ) : null}
          <form action={linkTaskAction} className="pops-inline" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={task.id} />
            <select name="targetId" required aria-label="Task to link" style={{ flex: "1 1 180px" }} defaultValue="">
              <option value="" disabled>Link a task…</option>
              {linkable.filter((t) => !linkedIds.has(t.id)).map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button type="submit" className="pops-secondary">Link</button>
          </form>

          <h2>Edit</h2>
          <details open={edit === "1"}>
            <summary className="pops-small pops-muted">Title, description, tags, next action</summary>
            <form action={updateTaskAction}>
              <input type="hidden" name="id" value={task.id} />
              <label htmlFor="e-title">Title</label>
              <input id="e-title" name="title" defaultValue={task.title} required maxLength={200} style={{ width: "100%" }} />
              <label htmlFor="e-ws">Workspace</label>
              <select id="e-ws" name="workspace" defaultValue={task.workspace}>
                {WORKSPACE_KEYS.map((key) => <option key={key} value={key}>{WORKSPACES[key].label}</option>)}
              </select>
              <label htmlFor="e-desc">Description</label>
              <textarea id="e-desc" name="description" defaultValue={task.description} maxLength={8000} />
              <label htmlFor="e-tags">Project tags</label>
              <input id="e-tags" name="tags" defaultValue={task.projectTags.join(", ")} style={{ width: "100%" }} />
              <label htmlFor="e-next">Suggested next action</label>
              <input id="e-next" name="suggestedNextAction" defaultValue={task.suggestedNextAction} maxLength={500} style={{ width: "100%" }} />
              <fieldset style={{ border: "none", padding: 0, margin: "10px 0 0" }}>
                <legend className="pops-small pops-muted">Recommended pipelines</legend>
                {pipelines.map((p) => (
                  <label key={p.slug} className="pops-check pops-small">
                    <input type="checkbox" name="recommendedPipelines" value={p.slug} defaultChecked={task.recommendedPipelines.includes(p.slug)} /> {p.name}
                  </label>
                ))}
              </fieldset>
              <div className="pops-actions"><button type="submit">Save</button></div>
            </form>
          </details>
        </aside>
      </div>
    </>
  );
}
