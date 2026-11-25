"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { markQuizQuestionAction } from "@/app/pops/quiz-actions";
import { nextUnmarked } from "@/lib/pops/quiz-player";

type Mark = "knew" | "guessed" | "confidently_wrong" | "close" | "tip_of_tongue" | "no_idea" | "skipped";

export type QuizPlayerQuestion = {
  id: string;
  position: number;
  section: string;
  label: string;
  text: string;
  answer: string;
  mark: Mark | null;
};

// Each mark's meaning, shown beside its button. Read top to bottom: the first that fits is the one.
const BUTTONS: { mark: Mark; label: string; key: string; hint: string }[] = [
  { mark: "knew", label: "Knew it", key: "1", hint: "Right, and you'd have said it straight away and been sure." },
  { mark: "guessed", label: "Guessed", key: "2", hint: "Right, but by deduction, elimination or a hunch rather than knowing." },
  { mark: "confidently_wrong", label: "Confidently wrong", key: "3", hint: "Wrong, and you were sure of a different answer: something you believed needs correcting." },
  { mark: "close", label: "Close", key: "4", hint: "Wrong, but the answer was one of your candidates, or you had part of it (e.g. surname but wrong forename)." },
  { mark: "tip_of_tongue", label: "Tip of my tongue", key: "5", hint: "Wrong, but it's familiar now you see it: you knew it once and couldn't bring it up." },
  { mark: "no_idea", label: "No idea", key: "6", hint: "Wrong, and the answer doesn't ring a bell, or only faintly." },
];

const LABELS: Record<Mark, string> = {
  knew: "Knew it",
  guessed: "Guessed",
  confidently_wrong: "Confidently wrong",
  close: "Close",
  tip_of_tongue: "Tip of my tongue",
  no_idea: "No idea",
  skipped: "Skipped",
};

export function QuizPlayer({ questions: initial, paperTitle }: { questions: QuizPlayerQuestion[]; paperTitle: string }) {
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(nextUnmarked(initial, 0), 0));
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(() => nextUnmarked(initial, 0) === -1);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const question = questions[index];
  const markedCount = useMemo(() => questions.filter((q) => q.mark).length, [questions]);

  const go = useCallback((i: number) => {
    setIndex(Math.min(Math.max(i, 0), questions.length - 1));
    setRevealed(false);
    setFinished(false);
  }, [questions.length]);

  const mark = useCallback(
    (value: Mark) => {
      const target = questions[index];
      const updated = questions.map((q, i) => (i === index ? { ...q, mark: value } : q));
      setQuestions(updated);
      setError(null);
      startTransition(async () => {
        const result = await markQuizQuestionAction(target.id, value);
        if (!result.ok) {
          setError(`Not saved: ${result.error}`);
          setQuestions((qs) => qs.map((q) => (q.id === target.id ? { ...q, mark: target.mark } : q)));
        }
      });
      // Changing an earlier mark steps forward; a fresh mark jumps to the next unmarked question.
      const reviewing = target.mark !== null;
      const next = reviewing ? (index + 1 < updated.length ? index + 1 : -1) : nextUnmarked(updated, index + 1);
      if (next === -1) {
        setFinished(true);
        setRevealed(false);
      } else {
        setIndex(next);
        setRevealed(false);
      }
    },
    [index, questions],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (finished) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const button = BUTTONS.find((b) => b.key === event.key);
        if (button) return mark(button.mark);
        if (event.key === "s") return mark("skipped");
      }
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, revealed, mark, go, index]);

  if (!questions.length) return <p className="pops-muted">This quiz has no questions.</p>;

  if (finished) {
    const counts = questions.reduce<Record<string, number>>((acc, q) => {
      const key = q.mark ?? "unmarked";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <section className="pops-quiz" aria-live="polite">
        <h2>All marked</h2>
        <p>{paperTitle}: {markedCount} of {questions.length} questions.</p>
        <ul className="pops-list pops-list--plain">
          {(Object.keys(LABELS) as Mark[]).map((m) => (counts[m] ? <li key={m}>{LABELS[m]}: {counts[m]}</li> : null))}
        </ul>
        {error ? <p className="pops-error" role="alert">{error}</p> : null}
        <p className="pops-quiz-actions">
          <button type="button" className="pops-secondary" onClick={() => go(0)}>Review answers</button>
          <Link href="/pops/quiz" className="pops-button">Back to quizzes</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="pops-quiz" aria-live="polite">
      <div className="pops-quiz-progress pops-meta">
        <span>{[question.section, question.label].filter(Boolean).join(" · ") || `Question ${question.position}`}</span>
        <span>{index + 1} of {questions.length} · {markedCount} marked</span>
      </div>
      <div className="pops-quiz-bar" aria-hidden="true">
        <div style={{ width: `${(markedCount / questions.length) * 100}%` }} />
      </div>

      <p className="pops-quiz-question">{question.text}</p>

      {revealed ? (
        <>
          <p className="pops-quiz-answer"><span className="pops-meta">Answer</span><br />{question.answer}</p>
          <div className="pops-quiz-marks" role="group" aria-label="How well did you know it?">
            {BUTTONS.map((b) => (
              <div key={b.mark} className="pops-quiz-mark-row">
                <button
                  type="button"
                  className={question.mark === b.mark ? "pops-quiz-mark pops-mode-active" : "pops-quiz-mark pops-secondary"}
                  onClick={() => mark(b.mark)}
                  aria-describedby={`quiz-hint-${b.mark}`}
                >
                  <span className="pops-quiz-key" aria-hidden="true">{b.key}</span> {b.label}
                </button>
                <span id={`quiz-hint-${b.mark}`} className="pops-quiz-hint">{b.hint}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <button type="button" className="pops-quiz-reveal" onClick={() => setRevealed(true)}>
          Show answer <span className="pops-quiz-key" aria-hidden="true">space</span>
        </button>
      )}

      {error ? <p className="pops-error" role="alert">{error}</p> : null}

      <div className="pops-quiz-nav pops-small">
        <button type="button" className="pops-link-button" onClick={() => go(index - 1)} disabled={index === 0}>← Previous</button>
        {revealed ? (
          <button type="button" className="pops-link-button" onClick={() => mark("skipped")}>Skip this one (s)</button>
        ) : null}
        <button type="button" className="pops-link-button" onClick={() => go(index + 1)} disabled={index === questions.length - 1}>Next →</button>
      </div>
      {question.mark ? <p className="pops-meta">Marked: {LABELS[question.mark]}</p> : null}
    </section>
  );
}
