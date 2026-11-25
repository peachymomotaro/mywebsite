import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Ladder, LadderQuestion } from "@/lib/ladder/daily";
import { localDate } from "@/lib/ladder/daily";
import { judge } from "@/lib/ladder/marking";
import styles from "@/styles/ladder.module.css";

type Lifeline = "swap" | "clue" | "letters";
type Outcome = "correct" | "wrong";
type Phase = "ready" | "asking" | "correct" | "lost" | "won";

type Saved = {
  phase: Phase;
  rung: number;
  outcomes: Outcome[];
  swapped: number | null;      // rung index the swap was used on
  revealed: Partial<Record<Lifeline, number>>; // lifeline -> rung index used on
  lastGuess: string;
};

type Stats = { played: number; best: number; streak: number; lastDate: string | null };

const LIFELINES: { id: Lifeline; label: string; icon: string; help: string }[] = [
  { id: "swap", label: "Swap", icon: "🔄", help: "Replace this question with another at the same level" },
  { id: "clue", label: "Extra clue", icon: "💡", help: "Show another quizbowl clue about the same answer" },
  { id: "letters", label: "Letters", icon: "🔤", help: "Show the answer's first letters and length" },
];

const fresh = (): Saved => ({
  phase: "ready", rung: 0, outcomes: [], swapped: null, revealed: {}, lastGuess: "",
});

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage blocked: the game still works, it just won't resume.
  }
}

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function credit(q: LadderQuestion): string {
  return q.set ? q.set : "QB Reader";
}

export default function LadderGame() {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Saved>(fresh);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ played: 0, best: 0, streak: 0, lastDate: null });
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ladder?date=${localDate()}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Couldn't load today's ladder.");
        return body as Ladder;
      })
      .then((data) => {
        if (cancelled) return;
        setLadder(data);
        const saved = read<Saved>(`ladder:${data.date}`);
        if (saved) setState(saved);
        const s = read<Stats>("ladder:stats");
        if (s) setStats(s);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: Saved) => {
    setState(next);
    if (ladder) write(`ladder:${ladder.date}`, next);
  }, [ladder]);

  const finish = useCallback((next: Saved) => {
    update(next);
    if (!ladder) return;
    const score = next.outcomes.filter((o) => o === "correct").length;
    const yesterday = localDate(new Date(Date.parse(`${ladder.date}T12:00:00`) - 86_400_000));
    const s: Stats = {
      played: stats.played + 1,
      best: Math.max(stats.best, score),
      streak: stats.lastDate === yesterday ? stats.streak + 1 : 1,
      lastDate: ladder.date,
    };
    if (stats.lastDate !== ladder.date) {
      setStats(s);
      write("ladder:stats", s);
    }
  }, [ladder, stats, update]);

  useEffect(() => {
    if (state.phase === "asking") inputRef.current?.focus();
  }, [state.phase, state.rung]);

  if (error) {
    return <div className={styles.panel}><p>{error}</p></div>;
  }
  if (!ladder) {
    return <div className={styles.panel}><p className={styles.muted}>Setting up today&rsquo;s ladder…</p></div>;
  }

  const total = ladder.rungs.length;
  const current = ladder.rungs[Math.min(state.rung, total - 1)];
  const question = state.swapped === state.rung ? current.swap : current.question;
  const usedOn = (l: Lifeline) => (l === "swap" ? state.swapped : state.revealed[l]) ?? null;
  const score = state.outcomes.filter((o) => o === "correct").length;
  const over = state.phase === "lost" || state.phase === "won";

  function takeLifeline(l: Lifeline) {
    if (usedOn(l) !== null || state.phase !== "asking") return;
    if (l === "swap") {
      // A swap brings a fresh question, so earlier reveals on this rung no longer apply.
      update({ ...state, swapped: state.rung });
      setFeedback(null);
      setGuess("");
    } else {
      update({ ...state, revealed: { ...state.revealed, [l]: state.rung } });
    }
    inputRef.current?.focus();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (state.phase !== "asking" || !guess.trim()) return;
    const verdict = judge(question.answerHtml, guess);
    if (verdict === "prompt") {
      setFeedback("Close — be more specific.");
      return;
    }
    setFeedback(null);
    if (verdict === "accept") {
      const outcomes: Outcome[] = [...state.outcomes, "correct"];
      const next = { ...state, outcomes, lastGuess: guess };
      if (outcomes.length === total) finish({ ...next, phase: "won" });
      else update({ ...next, phase: "correct" });
    } else {
      finish({ ...state, outcomes: [...state.outcomes, "wrong"], lastGuess: guess, phase: "lost" });
    }
  }

  function nextRung() {
    update({ ...state, rung: state.rung + 1, phase: "asking", lastGuess: "" });
    setGuess("");
  }

  function shareText() {
    const squares = ladder!.rungs.map((_, i) =>
      state.outcomes[i] === "correct" ? "🟩" : state.outcomes[i] === "wrong" ? "🟥" : "⬜").join("");
    const used = LIFELINES.filter((l) => usedOn(l.id) !== null).map((l) => l.icon).join(" ");
    return [
      `Ladder #${ladder!.number} · ${ladder!.topic}`,
      `🪜 ${score}/${total}`,
      squares,
      used ? `Lifelines: ${used}` : "No lifelines",
      "petercurry.org/ladder",
    ].join("\n");
  }

  async function share() {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  const showClue = state.revealed.clue === state.rung && !over;
  const showLetters = state.revealed.letters === state.rung && !over;

  return (
    <div className={styles.game}>
      <ol className={styles.ladder} aria-label="Your climb">
        {[...ladder.rungs].reverse().map((r) => {
          const i = r.rung - 1;
          const outcome = state.outcomes[i];
          const isCurrent = i === state.rung && !over && state.phase !== "ready";
          return (
            <li
              key={r.rung}
              className={[
                styles.rung,
                outcome === "correct" ? styles.rungDone : "",
                outcome === "wrong" ? styles.rungFailed : "",
                isCurrent ? styles.rungCurrent : "",
              ].join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={styles.rungNumber}>{r.rung}</span>
              <span className={styles.rungLevel}>{r.level}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.panel}>
        <p className={styles.kicker}>Ladder #{ladder.number} · today&rsquo;s topic</p>
        <h2 className={styles.topic}>{ladder.topic}</h2>

        {state.phase === "ready" && (
          <div className={styles.intro}>
            <p>
              Ten questions on one topic, each harder than the last: from middle-school
              quizbowl at the bottom to open tournaments at the top. Type your answers.
              Spelling doesn&rsquo;t need to be perfect.
            </p>
            <p>
              One wrong answer and you fall. You have three lifelines, each usable once:
              {" "}<strong>Swap</strong> the question, get an <strong>Extra clue</strong>,
              or see the answer&rsquo;s <strong>Letters</strong>.
            </p>
            <button className={styles.primary} onClick={() => update({ ...state, phase: "asking" })}>
              Start climbing
            </button>
          </div>
        )}

        {(state.phase === "asking" || state.phase === "correct") && (
          <>
            <p className={styles.level}>
              Rung {current.rung} of {total} · {current.level}
            </p>
            <div className={styles.question}>
              {question.leadin && <p className={styles.leadin}>{question.leadin}</p>}
              <p>{question.text}</p>
            </div>

            {showClue && question.clue && (
              <p className={styles.hint}><span>💡 Extra clue</span>{question.clue}</p>
            )}
            {showLetters && (
              <p className={styles.hint}><span>🔤 Letters</span><code>{question.letters}</code></p>
            )}

            {state.phase === "asking" ? (
              <>
                <form className={styles.answerRow} onSubmit={submit}>
                  <label className={styles.srOnly} htmlFor="ladder-answer">Your answer</label>
                  <input
                    id="ladder-answer"
                    ref={inputRef}
                    className={styles.input}
                    value={guess}
                    onChange={(e) => { setGuess(e.target.value); setFeedback(null); }}
                    placeholder="Your answer"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button className={styles.primary} type="submit" disabled={!guess.trim()}>
                    Answer
                  </button>
                </form>
                <p className={styles.feedback} role="status">{feedback}</p>
                <div className={styles.lifelines}>
                  {LIFELINES.map((l) => {
                    const used = usedOn(l.id) !== null;
                    const unavailable = l.id === "clue" && !question.clue;
                    return (
                      <button
                        key={l.id}
                        className={styles.lifeline}
                        onClick={() => takeLifeline(l.id)}
                        disabled={used || unavailable}
                        title={unavailable ? "No extra clue for this question" : l.help}
                      >
                        <span aria-hidden>{l.icon}</span> {l.label}
                        {used && <span className={styles.usedTag}>used</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={styles.result}>
                <p className={styles.correct}>✓ Correct: {question.answer}</p>
                <p className={styles.source}>From {credit(question)}</p>
                <button className={styles.primary} onClick={nextRung} autoFocus>
                  Climb to rung {state.rung + 2}
                </button>
              </div>
            )}
          </>
        )}

        {over && (
          <div className={styles.result}>
            {state.phase === "won" ? (
              <p className={styles.headline}>You reached the top. 10 out of 10.</p>
            ) : (
              <>
                <p className={styles.headline}>
                  You fell from rung {state.rung + 1}. {score} out of {total}.
                </p>
                <div className={styles.question}>
                  {question.leadin && <p className={styles.leadin}>{question.leadin}</p>}
                  <p>{question.text}</p>
                </div>
                <p className={styles.wrong}>
                  You said &ldquo;{state.lastGuess}&rdquo;. The answer was <strong>{question.answer}</strong>.
                </p>
                <p className={styles.source}>From {credit(question)}</p>
              </>
            )}
            <pre className={styles.share}>{shareText()}</pre>
            <button className={styles.primary} onClick={share}>{copied ? "Copied!" : "Share result"}</button>
            <p className={styles.muted}>
              Next ladder in {untilMidnight()} · Played {stats.played} · Best {stats.best}/10 ·
              {" "}Streak {stats.streak}
            </p>
            <details className={styles.review}>
              <summary>See the whole ladder</summary>
              <ol>
                {ladder.rungs.map((r, i) => {
                  const q = state.swapped === i ? r.swap : r.question;
                  return (
                    <li key={r.rung}>
                      <p className={styles.level}>{r.rung}. {r.level}</p>
                      {q.leadin && <p className={styles.leadin}>{q.leadin}</p>}
                      <p>{q.text}</p>
                      <p><strong>{q.answer}</strong> <span className={styles.source}>· {credit(q)}</span></p>
                    </li>
                  );
                })}
              </ol>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
