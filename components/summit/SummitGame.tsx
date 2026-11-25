import { CSSProperties, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Climb, CampQuestion } from "@/lib/summit/daily";
import { localDate } from "@/lib/summit/daily";
import { judge } from "@/lib/summit/marking";
import { CAMPS, formatAltitude, skyAt } from "@/lib/summit/mountain";
import styles from "@/styles/summit.module.css";

type Kit = "reroute" | "guide" | "map";
type Outcome = "correct" | "wrong";
type Phase = "ready" | "asking" | "correct" | "lost" | "won";

type Saved = {
  phase: Phase;
  camp: number;
  outcomes: Outcome[];
  used: Partial<Record<Kit, number>>; // kit -> camp index it was used at
  lastGuess: string;
};

type Stats = { climbs: number; best: number; summits: number; streak: number; lastDate: string | null };

const KIT: { id: Kit; label: string; icon: string; help: string }[] = [
  { id: "reroute", label: "Reroute", icon: "🔀", help: "Swap this question for another at the same altitude" },
  { id: "guide", label: "Guide", icon: "🧭", help: "Your guide offers one more clue about the answer" },
  { id: "map", label: "Trail map", icon: "🗺️", help: "Shows the answer's first letters and length" },
];

const fresh = (): Saved => ({ phase: "ready", camp: 0, outcomes: [], used: {}, lastGuess: "" });

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
    // Storage blocked: the climb still works, it just won't resume.
  }
}

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

/** Deterministic star field, so server and client render the same sky. */
function stars(count: number) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: count }, () => ({
    left: `${rand() * 100}%`, top: `${rand() * 55}%`, size: rand() < 0.15 ? 3 : rand() < 0.5 ? 2 : 1,
    delay: `${(rand() * 4).toFixed(2)}s`,
  }));
}
const STARS = stars(70);

function Question({ q }: { q: CampQuestion }) {
  return (
    <div className={styles.question}>
      {q.leadin && <p className={styles.leadin}>{q.leadin}</p>}
      <p>{q.text}</p>
    </div>
  );
}

function Mountain({ reached, current, failed, done }: {
  reached: number; current: number; failed: number | null; done: boolean;
}) {
  const climber = CAMPS[Math.min(current, CAMPS.length - 1)];
  const route = CAMPS.map((c) => `${c.x},${c.y}`).join(" ");
  const climbed = CAMPS.slice(0, Math.max(1, reached + (done && failed === null ? 0 : 1)))
    .map((c) => `${c.x},${c.y}`).join(" ");
  return (
    <svg className={styles.mountain} viewBox="0 0 400 620" role="img"
      aria-label={`Climb progress: ${reached} of ${CAMPS.length} camps reached`}>
      <defs>
        <linearGradient id="rock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4566" />
          <stop offset="1" stopColor="#1b2138" />
        </linearGradient>
        <linearGradient id="rockLight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56628a" />
          <stop offset="1" stopColor="#2a3150" />
        </linearGradient>
      </defs>
      {/* far ridge */}
      <path d="M-20 620 L40 380 L95 430 L150 300 L190 350 L230 250 L300 330 L345 270 L420 420 L420 620 Z"
        fill="#ffffff" opacity="0.08" />
      {/* main peak: shadow face and lit face */}
      <path d="M0 620 L70 470 L110 500 L160 330 L210 60 L250 200 L290 260 L330 380 L370 430 L400 620 Z"
        fill="url(#rock)" />
      <path d="M210 60 L250 200 L290 260 L330 380 L370 430 L400 620 L250 620 L230 420 L240 300 Z"
        fill="url(#rockLight)" opacity="0.55" />
      {/* snow */}
      <path d="M210 60 L232 140 L218 128 L204 152 L192 132 L180 160 L188 108 Z" fill="#f4f7ff" />
      <path d="M210 60 L232 140 L246 185 L236 178 L226 196 L222 150 Z" fill="#dfe6f7" />
      {/* route */}
      <polyline points={route} fill="none" stroke="#ffffff" strokeOpacity="0.35"
        strokeWidth="2" strokeDasharray="4 6" />
      <polyline points={climbed} fill="none" stroke="var(--signal)" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" className={styles.routeDone} />
      {CAMPS.map((c, i) => {
        const isDone = i < reached;
        const isFailed = failed === i;
        const isCurrent = i === current && !done;
        return (
          <g key={c.name} className={styles.camp}>
            {isCurrent && <circle cx={c.x} cy={c.y} r="13" className={styles.pulse} />}
            <circle cx={c.x} cy={c.y} r={i === CAMPS.length - 1 ? 7 : 5.5}
              fill={isFailed ? "var(--danger)" : isDone ? "var(--signal)" : "#0d1430"}
              stroke={isFailed ? "var(--danger)" : "#ffffff"} strokeWidth="2" />
            <text x={c.labelSide === "right" ? c.x + 16 : c.x - 16} y={c.y + 4}
              textAnchor={c.labelSide === "right" ? "start" : "end"}
              className={[styles.campLabel, isCurrent ? styles.campLabelCurrent : "",
                isDone ? styles.campLabelDone : ""].join(" ")}>
              {formatAltitude(c.altitude)}
              <tspan className={styles.campName} dx="6">{c.name}</tspan>
            </text>
          </g>
        );
      })}
      {/* summit flag, planted once you get there */}
      <g className={[styles.flag, reached === CAMPS.length ? styles.flagUp : ""].join(" ")}>
        <line x1="210" y1="60" x2="210" y2="28" stroke="#ffffff" strokeWidth="2" />
        <path d="M210 28 L234 35 L210 42 Z" fill="var(--signal)" />
      </g>
      {/* climber */}
      {!done && (
        <g className={styles.climber} style={{ transform: `translate(${climber.x}px, ${climber.y}px)` }}>
          <circle r="4.5" fill="#ffffff" />
          <circle r="2" fill="var(--signal)" />
        </g>
      )}
    </svg>
  );
}

export default function SummitGame() {
  const [climb, setClimb] = useState<Climb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Saved>(fresh);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ climbs: 0, best: 0, summits: 0, streak: 0, lastDate: null });
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/summit?date=${localDate()}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Couldn't load today's mountain.");
        return body as Climb;
      })
      .then((data) => {
        if (cancelled) return;
        setClimb(data);
        const saved = read<Saved>(`summit:${data.date}`);
        if (saved) setState(saved);
        const s = read<Stats>("summit:stats");
        if (s) setStats(s);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: Saved) => {
    setState(next);
    if (climb) write(`summit:${climb.date}`, next);
  }, [climb]);

  const finish = useCallback((next: Saved) => {
    update(next);
    if (!climb || stats.lastDate === climb.date) return;
    const reached = next.outcomes.filter((o) => o === "correct").length;
    const yesterday = localDate(new Date(Date.parse(`${climb.date}T12:00:00`) - 86_400_000));
    const s: Stats = {
      climbs: stats.climbs + 1,
      best: Math.max(stats.best, reached),
      summits: stats.summits + (next.phase === "won" ? 1 : 0),
      streak: stats.lastDate === yesterday ? stats.streak + 1 : 1,
      lastDate: climb.date,
    };
    setStats(s);
    write("summit:stats", s);
  }, [climb, stats, update]);

  useEffect(() => {
    if (state.phase === "asking") inputRef.current?.focus();
  }, [state.phase, state.camp]);

  const reached = state.outcomes.filter((o) => o === "correct").length;
  const over = state.phase === "lost" || state.phase === "won";
  const failed = state.phase === "lost" ? state.camp : null;
  // The sky follows the climber: the camp you're on, or the highest one reached.
  const height = state.phase === "ready" ? 0 : Math.min(state.camp + (state.phase === "correct" ? 1 : 0), 9) / 9;
  const sky = useMemo(() => skyAt(state.phase === "won" ? 1 : height), [height, state.phase]);

  const skyStyle = {
    "--sky-top": sky.top, "--sky-mid": sky.mid, "--sky-bottom": sky.bottom,
    "--star-opacity": sky.stars, "--ridge-shift": `${height * 90}px`,
  } as CSSProperties;

  const page = (body: ReactNode) => (
    <div className={styles.sky} style={skyStyle}>
      <div className={styles.stars} aria-hidden>
        {STARS.map((s, i) => (
          <span key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
        ))}
      </div>
      <div className={styles.ridges} aria-hidden>
        <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={styles.ridgeBack}>
          <path d="M0 220 L0 140 L120 80 L230 130 L360 60 L470 120 L600 40 L720 110 L850 70 L980 130 L1100 60 L1200 100 L1200 220 Z" />
        </svg>
        <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={styles.ridgeFront}>
          <path d="M0 220 L0 170 L150 120 L280 165 L420 110 L560 170 L700 125 L830 175 L990 115 L1120 160 L1200 140 L1200 220 Z" />
        </svg>
      </div>
      {body}
    </div>
  );

  if (error || !climb) {
    return page(
      <div className={styles.loading}>
        <p>{error ?? "Checking the weather on the mountain…"}</p>
      </div>,
    );
  }

  const camps = climb.rungs;
  const total = camps.length;
  const current = camps[Math.min(state.camp, total - 1)];
  const camp = CAMPS[Math.min(state.camp, CAMPS.length - 1)];
  const question = state.used.reroute === state.camp ? current.swap : current.question;
  const usedKit = KIT.filter((k) => state.used[k.id] !== undefined);
  const freeSolo = state.phase === "won" && usedKit.length === 0;
  const topAltitude = reached > 0 ? CAMPS[reached - 1].altitude : 0;

  function takeKit(k: Kit) {
    if (state.used[k] !== undefined || state.phase !== "asking") return;
    update({ ...state, used: { ...state.used, [k]: state.camp } });
    if (k === "reroute") {
      setFeedback(null);
      setGuess("");
    }
    inputRef.current?.focus();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (state.phase !== "asking" || !guess.trim()) return;
    const verdict = judge(question.answerHtml, guess);
    if (verdict === "prompt") {
      setFeedback("Narrower… you're on the right track.");
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

  function climbOn() {
    update({ ...state, camp: state.camp + 1, phase: "asking", lastGuess: "" });
    setGuess("");
  }

  function shareText() {
    const squares = camps.map((_, i) =>
      state.outcomes[i] === "correct" ? "🟧" : state.outcomes[i] === "wrong" ? "🟥" : "⬜").join("");
    const line = state.phase === "won"
      ? `🚩 Summited · ${formatAltitude(CAMPS[CAMPS.length - 1].altitude)}`
      : `🧗 Reached ${formatAltitude(topAltitude)} · ${reached}/${total}`;
    const kit = freeSolo ? "Free solo 🧗" : usedKit.length ? `Kit: ${usedKit.map((k) => k.icon).join(" ")}` : "No kit used";
    return [`⛰️ Summit #${climb!.number} · ${climb!.topic}`, line, squares, kit, "petercurry.org/summit"].join("\n");
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

  const showGuide = state.used.guide === state.camp && !over;
  const showMap = state.used.map === state.camp && !over;

  return page(
    <div className={styles.stage}>
      <header className={styles.header}>
        <a href="/" className={styles.home}>petercurry.org</a>
        <h1 className={styles.wordmark}>Summit</h1>
        <p className={styles.number}>#{climb.number}</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.mountainWrap}>
          <Mountain reached={reached} current={state.camp} failed={failed} done={over} />
        </div>

        <section className={styles.card} aria-live="polite">
          <p className={styles.eyebrow}>Today&rsquo;s mountain</p>
          <h2 className={styles.topic}>{climb.topic}</h2>

          {state.phase === "ready" && (
            <div className={styles.intro}>
              <p>
                Ten questions, one subject. Start at the trailhead with middle-school
                quizbowl and climb to the summit, where the open-tournament questions live.
              </p>
              <p>One wrong answer and you fall. Spelling doesn&rsquo;t need to be perfect.</p>
              <ul className={styles.kitList}>
                {KIT.map((k) => (
                  <li key={k.id}><span aria-hidden>{k.icon}</span> <strong>{k.label}</strong> {k.help.toLowerCase()}.</li>
                ))}
              </ul>
              <p className={styles.small}>Each piece of kit works once. Reach the top without any for a free solo.</p>
              <button className={styles.primary} onClick={() => update({ ...state, phase: "asking" })}>
                Begin the ascent
              </button>
            </div>
          )}

          {(state.phase === "asking" || state.phase === "correct") && (
            <>
              <div className={styles.altimeter}>
                <span className={styles.altitude}>{formatAltitude(camp.altitude)}</span>
                <span className={styles.campTitle}>{camp.name}</span>
                <span className={styles.level}>{current.level}</span>
              </div>
              <Question q={question} />

              {showGuide && question.clue && (
                <p className={styles.hint}><span>🧭 Your guide says</span>{question.clue}</p>
              )}
              {showMap && (
                <p className={styles.hint}><span>🗺️ Trail map</span><code>{question.letters}</code></p>
              )}

              {state.phase === "asking" ? (
                <>
                  <form className={styles.answerRow} onSubmit={submit}>
                    <label className={styles.srOnly} htmlFor="summit-answer">Your answer</label>
                    <input
                      id="summit-answer"
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
                      Climb
                    </button>
                  </form>
                  <p className={styles.feedback} role="status">{feedback}</p>
                  <div className={styles.kit} role="group" aria-label="Kit">
                    {KIT.map((k) => {
                      const used = state.used[k.id] !== undefined;
                      const unavailable = k.id === "guide" && !question.clue;
                      return (
                        <button
                          key={k.id}
                          className={styles.kitButton}
                          onClick={() => takeKit(k.id)}
                          disabled={used || unavailable}
                          title={unavailable ? "No guide on this stretch" : k.help}
                        >
                          <span aria-hidden>{k.icon}</span> {k.label}
                          {used && <span className={styles.usedTag}>used</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.result}>
                  <p className={styles.correct}>✓ {question.answer}</p>
                  <p className={styles.small}>{camp.name} reached · from {question.set || "QB Reader"}</p>
                  <button className={styles.primary} onClick={climbOn} autoFocus>
                    Climb to {formatAltitude(CAMPS[state.camp + 1].altitude)} →
                  </button>
                </div>
              )}
            </>
          )}

          {over && (
            <div className={styles.result}>
              {state.phase === "won" ? (
                <>
                  <p className={styles.headline}>You summited.</p>
                  {freeSolo && <p className={styles.badge}>🧗 Free solo</p>}
                </>
              ) : (
                <>
                  <p className={styles.headline}>
                    You fell at {formatAltitude(camp.altitude)}.
                  </p>
                  <Question q={question} />
                  <p>
                    You said &ldquo;{state.lastGuess}&rdquo;. The answer was <strong>{question.answer}</strong>.
                  </p>
                  <p className={styles.small}>From {question.set || "QB Reader"}</p>
                </>
              )}
              <pre className={styles.share}>{shareText()}</pre>
              <button className={styles.primary} onClick={share}>{copied ? "Copied!" : "Share your climb"}</button>
              <p className={styles.small}>
                New mountain in {untilMidnight()} · Climbs {stats.climbs} · Summits {stats.summits} ·
                {" "}Best {stats.best ? formatAltitude(CAMPS[stats.best - 1].altitude) : "—"} · Streak {stats.streak}
              </p>
              <details className={styles.review}>
                <summary>See the whole route</summary>
                <ol>
                  {camps.map((r, i) => {
                    const q = state.used.reroute === i ? r.swap : r.question;
                    return (
                      <li key={r.rung}>
                        <p className={styles.reviewAltitude}>
                          {formatAltitude(CAMPS[i].altitude)} · {CAMPS[i].name} · {r.level}
                        </p>
                        <Question q={q} />
                        <p><strong>{q.answer}</strong> <span className={styles.small}>· {q.set || "QB Reader"}</span></p>
                      </li>
                    );
                  })}
                </ol>
              </details>
            </div>
          )}
        </section>
      </div>

      <footer className={styles.credits}>
        Questions from <a href="https://www.qbreader.org">QB Reader</a>, written for real quizbowl
        tournaments and credited by set; altitude is QB Reader&rsquo;s difficulty level. Subjects come
        from Matthew Spry&rsquo;s QB-curricula model, which files every history answer by period and
        ranks how well known it is.
      </footer>
    </div>,
  );
}
