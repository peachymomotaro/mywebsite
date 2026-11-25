import Link from "next/link";
import { archiveQuizPaperAction } from "@/app/pops/quiz-actions";
import { formatDate } from "@/lib/pops/format";
import { listQuizPapers } from "@/lib/pops/quiz";

export const metadata = { title: "Quiz" };

export default async function QuizIndexPage() {
  const papers = await listQuizPapers();
  const toMark = papers.filter((p) => p.marked < p.total);
  const done = papers.filter((p) => p.total > 0 && p.marked >= p.total);

  return (
    <>
      <div className="pops-pagehead">
        <h1>Quiz</h1>
      </div>
      <p className="pops-lede">
        Go through each quiz one question at a time and say how well you knew it. Quiz Trainer reads your marks when the weekly job runs.
      </p>

      <h2>To mark</h2>
      {toMark.length ? (
        <ul className="pops-list">
          {toMark.map((p) => (
            <li key={p.id}>
              <div className="pops-row">
                <Link href={`/pops/quiz/${p.id}`} className="pops-plain">{p.title}</Link>
                <span className="pops-meta">{p.marked} / {p.total}</span>
              </div>
              <div className="pops-sub">
                {[p.circuit, p.playedOn ? formatDate(p.playedOn) : null, p.setBy ? `set by ${p.setBy}` : null].filter(Boolean).join(" · ")}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pops-muted">Nothing waiting. New quizzes appear after the weekly job runs.</p>
      )}

      {done.length ? (
        <>
          <h2>Marked</h2>
          <ul className="pops-list">
            {done.map((p) => (
              <li key={p.id}>
                <div className="pops-row">
                  <Link href={`/pops/quiz/${p.id}`} className="pops-plain">{p.title}</Link>
                  <form action={archiveQuizPaperAction}>
                    <input type="hidden" name="paperId" value={p.id} />
                    <input type="hidden" name="archived" value="1" />
                    <button type="submit" className="pops-link-button pops-small">Hide</button>
                  </form>
                </div>
                <div className="pops-sub">{[p.circuit, p.playedOn ? formatDate(p.playedOn) : null].filter(Boolean).join(" · ")}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
