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

/** Result first; provenance and secondary detail in muted text. */
export function RunDetail({
  run,
  taskId,
  showAccomplished = true,
}: {
  run: PopsAgentRun & { feedback: PopsRunFeedback | null };
  taskId: string;
  showAccomplished?: boolean;
}) {
  const sources = (run.sources as Source[]) ?? [];
  const artefacts = (run.artefacts as Artefact[]) ?? [];
  const nextActions = (run.nextActions as string[]) ?? [];

  return (
    <div>
      {showAccomplished ? <p className="pops-description">{run.accomplished}</p> : null}
      <p className="pops-small pops-muted">
        {run.outcome !== "completed" ? <strong>{run.outcome}. </strong> : null}
        Asked to: {run.attempted}
        {" "}({run.pipelineSlug ? `${run.pipelineSlug} v${run.pipelineVersion}, ` : ""}via {run.channel})
      </p>
      {run.uncertainties ? <p className="pops-small"><strong>Uncertain:</strong> {run.uncertainties}</p> : null}
      {run.blockers ? <p className="pops-small"><strong>Blocked:</strong> {run.blockers}</p> : null}

      {sources.length ? (
        <>
          <h4>Sources</h4>
          <ul>
            {sources.map((s, i) => (
              <li key={i}>
                <SafeLink href={s.url}>{s.title}</SafeLink>
                {s.author ? <span className="pops-muted"> — {s.author}</span> : null}
                {s.note ? <div className="pops-small pops-muted">{s.note}</div> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {artefacts.map((a, i) => (
        <div key={i}>
          <h4>{a.cards?.length ? `Anki cards (${a.cards.length})` : "Produced"}</h4>
          {a.cards?.length ? (
            <>
              {a.cards.map((card) => (
                <div key={card.id} className="pops-card">
                  <div>{card.front}</div>
                  <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{card.back.split("\n")[0]}</p>
                  <pre>{card.back.split("\n").slice(1).join("\n").trim()}</pre>
                  <CopyButton className="pops-link-button pops-small" label="Copy inbox JSON" text={inboxJson(card)} />
                </div>
              ))}
              {a.cards.length > 1 ? (
                <CopyButton
                  className="pops-link-button pops-small"
                  label="Copy all cards"
                  text={a.cards.map((c) => `// ${c.id}.json\n${inboxJson(c)}`).join("\n\n")}
                />
              ) : null}
            </>
          ) : (
            <p>
              <SafeLink href={a.url}>{a.title}</SafeLink>
              {a.summary ? <span className="pops-muted"> — {a.summary}</span> : null}
            </p>
          )}
        </div>
      ))}

      {nextActions.length ? (
        <>
          <h4>Suggested next</h4>
          <ul>{nextActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </>
      ) : null}
      {run.pipelineReview ? <p className="pops-small pops-muted" style={{ marginTop: 10 }}>Pipeline review: {run.pipelineReview}</p> : null}

      <form action={feedbackAction} className="pops-feedback" aria-label="Feedback on this run">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="runId" value={run.id} />
        <div className="pops-inline">
          <label className="pops-check pops-check--inline pops-small">
            <input type="radio" name="useful" value="yes" defaultChecked={run.feedback?.useful === true} required /> Useful
          </label>
          <label className="pops-check pops-check--inline pops-small">
            <input type="radio" name="useful" value="no" defaultChecked={run.feedback?.useful === false} /> Not useful
          </label>
          <input type="text" name="reason" placeholder="Why? (optional)" maxLength={300} defaultValue={run.feedback?.reason ?? ""} aria-label="Reason" />
          <button type="submit" className="pops-secondary">{run.feedback ? "Update" : "Save"}</button>
        </div>
        <details className="pops-more" open={Boolean(run.feedback?.comments)}>
          <summary>Comments</summary>
          <textarea name="comments" maxLength={2000} defaultValue={run.feedback?.comments ?? ""} aria-label="Comments" />
        </details>
      </form>
    </div>
  );
}
