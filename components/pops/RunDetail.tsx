import type { PopsAgentRun, PopsRunFeedback } from "@prisma/client";
import { feedbackAction } from "@/app/pops/actions";
import { CopyButton } from "@/components/pops/CopyButton";
import type { AnkiCard } from "@/lib/pops/validation";

type Source = { title: string; url?: string; author?: string; kind?: string; note?: string };
type Artefact = { title: string; kind?: string; url?: string; summary?: string; cards?: AnkiCard[] };

function SafeLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href || !/^(https?|obsidian):\/\//i.test(href)) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
}

function inboxJson(card: AnkiCard) {
  return JSON.stringify({ version: 1, id: card.id, deck: card.deck, front: card.front, back: card.back }, null, 2);
}

export function RunDetail({ run, taskId }: { run: PopsAgentRun & { feedback: PopsRunFeedback | null }; taskId: string }) {
  const sources = (run.sources as Source[]) ?? [];
  const artefacts = (run.artefacts as Artefact[]) ?? [];
  const nextActions = (run.nextActions as string[]) ?? [];

  return (
    <div>
      <dl>
        <dt>Outcome</dt>
        <dd>{run.outcome}{run.pipelineSlug ? ` · ${run.pipelineSlug} v${run.pipelineVersion}` : ""} · via {run.channel}{run.agentName ? ` · ${run.agentName}` : ""}</dd>
        <dt>Attempted</dt>
        <dd>{run.attempted}</dd>
        <dt>Accomplished</dt>
        <dd>{run.accomplished}</dd>
        {run.uncertainties ? (<><dt>Uncertain</dt><dd>{run.uncertainties}</dd></>) : null}
        {run.blockers ? (<><dt>Blockers</dt><dd>{run.blockers}</dd></>) : null}
        {nextActions.length ? (
          <>
            <dt>Next actions</dt>
            <dd><ul>{nextActions.map((a, i) => <li key={i}>{a}</li>)}</ul></dd>
          </>
        ) : null}
        {run.pipelineReview ? (<><dt>Pipeline review</dt><dd>{run.pipelineReview}</dd></>) : null}
      </dl>

      {sources.length ? (
        <>
          <h4>Sources</h4>
          <ul>
            {sources.map((s, i) => (
              <li key={i}>
                <SafeLink href={s.url}>{s.title}</SafeLink>
                {s.author ? ` — ${s.author}` : ""}
                {s.kind && s.kind !== "other" ? <span className="pops-tag"> {s.kind}</span> : null}
                {s.note ? <div className="pops-small pops-muted">{s.note}</div> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {artefacts.length ? (
        <>
          <h4>Artefacts</h4>
          <ul>
            {artefacts.map((a, i) => (
              <li key={i}>
                <SafeLink href={a.url}>{a.title}</SafeLink>
                {a.kind ? <span className="pops-tag"> {a.kind}</span> : null}
                {a.summary ? <div className="pops-small pops-muted">{a.summary}</div> : null}
                {a.cards?.length ? (
                  <div>
                    <p className="pops-small pops-muted">
                      Quiz Trainer inbox format — one file per card at <code>chatgpt/anki-inbox/&lt;id&gt;.json</code>.{" "}
                      <CopyButton
                        className="pops-link-button"
                        label="Copy all"
                        text={a.cards.map((c) => `// ${c.id}.json\n${inboxJson(c)}`).join("\n\n")}
                      />
                    </p>
                    {a.cards.map((card) => (
                      <div key={card.id} className="pops-card">
                        <strong>{card.front}</strong>
                        <pre>{card.back}</pre>
                        <div className="pops-actions">
                          <code>{card.id}</code>
                          <CopyButton className="pops-link-button" label="Copy inbox JSON" text={inboxJson(card)} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <form action={feedbackAction} className="pops-feedback" aria-label="Feedback on this run">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="runId" value={run.id} />
        <div className="pops-inline">
          <label className="pops-check">
            <input type="radio" name="useful" value="yes" defaultChecked={run.feedback?.useful === true} required /> Useful
          </label>
          <label className="pops-check">
            <input type="radio" name="useful" value="no" defaultChecked={run.feedback?.useful === false} /> Not useful
          </label>
          <input type="text" name="reason" placeholder="Short reason" maxLength={300} defaultValue={run.feedback?.reason ?? ""} aria-label="Reason" />
          <button type="submit" className="pops-secondary">{run.feedback ? "Update feedback" : "Save feedback"}</button>
        </div>
        <details>
          <summary className="pops-small pops-muted">Comments</summary>
          <textarea name="comments" maxLength={2000} defaultValue={run.feedback?.comments ?? ""} aria-label="Comments" />
        </details>
        {run.feedback?.relayed ? <p className="pops-small pops-muted">Feedback was relayed by an agent.</p> : null}
      </form>
    </div>
  );
}
