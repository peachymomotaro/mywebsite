import { CSSProperties, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Climb, CampQuestion } from "@/lib/summit/daily";
import { localDate } from "@/lib/summit/daily";
import { judge } from "@/lib/summit/marking";
import { CAMPS, formatAltitude, skyAt } from "@/lib/summit/mountain";
import SummitView from "@/components/summit/SummitView";
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

const KIT: { id: Kit; label: string; share: string; help: string }[] = [
  { id: "reroute", label: "Reroute", share: "🔀", help: "Swap this question for another at the same altitude" },
  { id: "guide", label: "Guide", share: "🧭", help: "One more clue about the answer" },
  { id: "map", label: "Trail map", share: "🗺️", help: "The answer's first letters and length" },
];

function KitIcon({ kit }: { kit: Kit }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor",
    strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kit === "reroute") {
    return <svg {...common}><path d="M2 5h9l-2.5-2.5M14 11H5l2.5 2.5" /></svg>;
  }
  if (kit === "guide") {
    return <svg {...common}><circle cx="8" cy="8" r="6" /><path d="M10.5 5.5 9 9l-3.5 1.5L7 7z" /></svg>;
  }
  return <svg {...common}><path d="M1.5 3.5 5.5 2l5 1.5 4-1.5v10.5l-4 1.5-5-1.5-4 1.5zM5.5 2v10.5M10.5 3.5V14" /></svg>;
}

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

function Question({ q }: { q: CampQuestion }) {
  return (
    <div className={styles.question}>
      {q.leadin && <p className={styles.leadin}>{q.leadin}</p>}
      <p>{q.text}</p>
    </div>
  );
}

/** The Wanderer, seen from behind: frock coat, hair in the wind, a stick. */
function Wanderer({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`} className={styles.wanderer}>
      <path d="M-1.2 -19.5c-2.6 0-3.6 2-3.2 4 .2 1.1.8 1.9 1.6 2.3-2.6.9-3.9 3-4.2 6.2L-8 2.6c0 .6.5.9 1.1.8l1.5-.3.3 7.4h2.6l.9-6.8.9 6.8h2.6l.3-7.4 1.4.3c.6.1 1.1-.2 1.1-.8l-.9-9.6c-.3-3.1-1.6-5.3-4.1-6.2.8-.4 1.5-1.3 1.6-2.4.3-2-.8-3.9-3.5-3.9z" />
      <path d="M5.6 -3.5 9 10.5" stroke="currentColor" strokeWidth="0.9" />
      <path d="M-4.6 -16.8c-1.6-.4-3.2.1-4.2 1.2 1.4-.2 2.6.2 3.6.9z" opacity="0.85" />
    </g>
  );
}

function Mountain({ reached, current, failed, done, won, fog }: {
  reached: number; current: number; failed: number | null; done: boolean; won: boolean; fog: number;
}) {
  const climber = CAMPS[Math.min(current, CAMPS.length - 1)];
  const route = CAMPS.map((c) => `${c.x},${c.y}`).join(" ");
  const climbed = CAMPS.slice(0, Math.max(1, reached + (won ? 0 : 1))).map((c) => `${c.x},${c.y}`).join(" ");
  // Where the top of the fog bank sits on the mountain (SVG y).
  const fogTop = 240 + (1 - fog) * 360;
  return (
    <svg className={styles.mountain} viewBox="0 0 400 620" role="img"
      aria-label={`Climb progress: ${reached} of ${CAMPS.length} camps reached`}>
      <defs>
        <linearGradient id="crag" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#4a4038" />
          <stop offset="0.55" stopColor="#2d2722" />
          <stop offset="1" stopColor="#1d1916" />
        </linearGradient>
        <linearGradient id="cragLit" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a6a58" />
          <stop offset="1" stopColor="#3b332c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fogFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4e7e3" stopOpacity="0" />
          <stop offset="0.12" stopColor="#e4e7e3" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#e4e7e3" stopOpacity="0.78" />
          <stop offset="1" stopColor="#e4e7e3" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="footFog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6e8e3" stopOpacity="0" />
          <stop offset="0.7" stopColor="#e6e8e3" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e6e8e3" />
        </linearGradient>
        <filter id="labelShadow" x="-10%" y="-60%" width="120%" height="220%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="1.6" floodColor="#140f0b" floodOpacity="0.85" />
        </filter>
        <filter id="mist" x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* distant ranges, slate blue through the haze */}
      <path d="M-30 620 L20 410 L70 450 L120 330 L170 380 L215 300 L270 360 L320 300 L370 380 L430 340 L430 620 Z"
        fill="#7d8c94" opacity="0.55" />
      <path d="M-30 620 L40 470 L100 500 L160 430 L240 470 L300 420 L360 470 L430 440 L430 620 Z"
        fill="#66757d" opacity="0.5" />

      {/* the crag: a jagged, Friedrich-dark spine of rock */}
      <path d="M0 620 L22 566 L50 552 L72 508 L98 494 L118 448 L136 436 L146 392 L160 366 L164 330
               L178 304 L182 262 L194 232 L196 188 L204 150 L202 116 L210 84 L214 60 L219 72 L224 68
               L230 100 L238 116 L242 148 L254 172 L258 206 L274 228 L280 262 L296 286 L302 324
               L322 350 L330 386 L348 412 L360 452 L378 476 L390 528 L400 620 Z" fill="url(#crag)" />
      <path d="M214 60 L219 72 L224 68 L230 100 L238 116 L242 148 L254 172 L258 206 L274 228 L280 262
               L296 286 L302 324 L322 350 L330 386 L348 412 L360 452 L378 476 L390 528 L400 620
               L310 620 L296 520 L280 430 L262 340 L246 260 L232 170 L222 110 Z"
        fill="url(#cragLit)" opacity="0.75" />
      {/* facets and ledges */}
      <path d="M118 448 L162 458 M146 392 L188 400 M164 330 L204 338 M182 262 L222 272 M196 188 L226 196
               M232 170 L214 230 L222 300 M262 340 L240 410 L252 480"
        stroke="#5e5144" strokeWidth="1.1" fill="none" opacity="0.55" />
      {/* foreground rocks, as in the painting */}
      <path d="M-10 620 L-10 572 L26 556 L52 584 L84 570 L118 602 L140 620 Z" fill="#171310" />
      <path d="M290 620 L318 590 L346 600 L372 576 L410 590 L410 620 Z" fill="#1b1713" />

      {/* route */}
      <polyline points={route} fill="none" stroke="#f3ecdc" strokeOpacity="0.5"
        strokeWidth="1.4" strokeDasharray="2 5" />
      <polyline points={climbed} fill="none" stroke="var(--ochre)" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />

      {CAMPS.map((c, i) => {
        const isDone = i < reached;
        const isFailed = failed === i;
        const isCurrent = i === current && !done;
        return (
          <g key={c.name}>
            {isCurrent && <circle cx={c.x} cy={c.y} r="11" className={styles.pulse} />}
            <circle cx={c.x} cy={c.y} r={i === CAMPS.length - 1 ? 5.5 : 4.2}
              fill={isFailed ? "var(--crimson)" : isDone ? "var(--ochre)" : "#efe8d8"}
              stroke="#1d1916" strokeWidth="1.4" />
            <text x={c.x + 15} y={c.y + 4} filter="url(#labelShadow)"
              className={[styles.campLabel, isCurrent ? styles.campLabelCurrent : "",
                isDone ? styles.campLabelDone : ""].join(" ")}>
              {c.name}
              <tspan className={styles.campAltitude} dx="6">{formatAltitude(c.altitude)}</tspan>
            </text>
          </g>
        );
      })}

      {/* the sea of fog, sinking below you as you climb */}
      <g className={styles.fogBank} style={{ transform: `translateY(${fogTop}px)` }} filter="url(#mist)">
        <ellipse cx="60" cy="10" rx="120" ry="26" fill="#eef0ec" opacity="0.8" />
        <ellipse cx="250" cy="0" rx="150" ry="30" fill="#e6e9e5" opacity="0.75" />
        <ellipse cx="400" cy="18" rx="110" ry="24" fill="#eef0ec" opacity="0.8" />
        <rect x="-300" y="-30" width="1000" height="470" fill="url(#fogFill)" />
      </g>
      {/* the mountain's foot always dissolves into fog */}
      <rect x="-300" y="540" width="1000" height="100" fill="url(#footFog)" />

      {/* the Wanderer: climbing, then standing on the summit */}
      {won ? (
        <g className={styles.summitFigure} transform="translate(214 49)">
          <Wanderer scale={1.15} />
        </g>
      ) : !done && (
        <g className={styles.climber} style={{ transform: `translate(${climber.x}px, ${climber.y - 12}px)` }}>
          <Wanderer scale={0.62} />
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
  const won = state.phase === "won";
  const failed = state.phase === "lost" ? state.camp : null;
  // The light follows the climber: the camp you're on, or the highest reached.
  const height = won ? 1
    : state.phase === "ready" ? 0
      : Math.min(state.camp + (state.phase === "correct" ? 1 : 0), 9) / 9;
  const sky = useMemo(() => skyAt(height), [height]);

  const skyStyle = {
    "--sky-top": sky.top, "--sky-mid": sky.mid, "--sky-bottom": sky.bottom,
    "--fog-height": `${Math.round(18 + sky.fog * 52)}vh`,
    "--glow-opacity": (1 - sky.fog).toFixed(2),
  } as CSSProperties;

  const page = (body: ReactNode) => (
    <div className={styles.sky} style={skyStyle}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.seaOfFog} aria-hidden>
        <span /><span /><span />
      </div>
      {body}
    </div>
  );

  if (error || !climb) {
    return page(
      <div className={styles.loading}>
        <p>{error ?? "The fog is lifting…"}</p>
      </div>,
    );
  }

  const camps = climb.rungs;
  const total = camps.length;
  const current = camps[Math.min(state.camp, total - 1)];
  const camp = CAMPS[Math.min(state.camp, CAMPS.length - 1)];
  const question = state.used.reroute === state.camp ? current.swap : current.question;
  const usedKit = KIT.filter((k) => state.used[k.id] !== undefined);
  const freeSolo = won && usedKit.length === 0;
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
      setFeedback("Narrower — you're on the right path.");
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
    const line = won
      ? `🚩 Summited · ${formatAltitude(CAMPS[CAMPS.length - 1].altitude)}`
      : `🧗 Reached ${formatAltitude(topAltitude)} · ${reached}/${total}`;
    const kit = freeSolo ? "Free solo 🧗" : usedKit.length ? `Kit: ${usedKit.map((k) => k.share).join(" ")}` : "No kit used";
    return [`⛰️ Summit No. ${climb!.number} · ${climb!.topic}`, line, squares, kit, "petercurry.org/summit"].join("\n");
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
        <h1 className={styles.wordmark}>Summit</h1>
        <p className={styles.number}>No. {climb.number}</p>
      </header>

      {won && (
        <SummitView answers={camps.map((r, i) => (state.used.reroute === i ? r.swap : r.question).answer)} />
      )}

      <div className={won ? styles.layoutSolo : styles.layout}>
        {!won && (
          <div className={styles.mountainWrap}>
            <Mountain reached={reached} current={state.camp} failed={failed} done={over}
              won={won} fog={sky.fog} />
          </div>
        )}

        <section className={styles.card} aria-live="polite">
          <h2 className={styles.topic}>{climb.topic}</h2>

          {state.phase === "ready" && (
            <div className={styles.intro}>
              <p className={styles.lede}>
                Ten questions on one subject, rising from the easy foothills to questions
                only the best quizbowl players know.
              </p>
              <p>Answer in your own words; spelling can wander. One wrong answer and you fall.</p>
              <ul className={styles.kitList}>
                {KIT.map((k) => (
                  <li key={k.id}>
                    <KitIcon kit={k.id} />
                    <span><strong>{k.label}.</strong> {k.help}.</span>
                  </li>
                ))}
              </ul>
              <p className={styles.quiet}>Each works once. Reach the top without them for a free solo.</p>
              <button className={styles.primary} onClick={() => update({ ...state, phase: "asking" })}>
                Begin the ascent
              </button>
            </div>
          )}

          {(state.phase === "asking" || state.phase === "correct") && (
            <>
              <div className={styles.altimeter} title={current.level}>
                <span className={styles.altitude}>{formatAltitude(camp.altitude)}</span>
                <span className={styles.campTitle}>{camp.name}</span>
              </div>
              <Question q={question} />

              {showGuide && question.clue && (
                <p className={styles.hint}><KitIcon kit="guide" /> <span>{question.clue}</span></p>
              )}
              {showMap && (
                <p className={styles.hint}><KitIcon kit="map" /> <span className={styles.letters}>{question.letters}</span></p>
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
                          <KitIcon kit={k.id} /> {k.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.result}>
                  <p className={styles.correct}>{question.answer}</p>
                  <p className={styles.quiet}>{camp.name} reached. From {question.set || "QB Reader"}.</p>
                  <button className={styles.primary} onClick={climbOn} autoFocus>
                    Climb to {formatAltitude(CAMPS[state.camp + 1].altitude)}
                  </button>
                </div>
              )}
            </>
          )}

          {over && (
            <div className={styles.result}>
              {won ? (
                <>
                  <p className={styles.headline}>Above the fog.</p>
                  <p className={styles.lede}>You reached the summit{freeSolo ? ", free solo" : ""}.</p>
                </>
              ) : (
                <>
                  <p className={styles.headline}>You fell at {formatAltitude(camp.altitude)}.</p>
                  <Question q={question} />
                  <p>
                    You said &ldquo;{state.lastGuess}&rdquo;. The answer was <strong>{question.answer}</strong>.
                  </p>
                  <p className={styles.quiet}>From {question.set || "QB Reader"}.</p>
                </>
              )}
              <pre className={styles.share}>{shareText()}</pre>
              <button className={styles.primary} onClick={share}>{copied ? "Copied" : "Share your climb"}</button>
              <dl className={styles.stats}>
                <div><dt>Next mountain</dt><dd>{untilMidnight()}</dd></div>
                <div><dt>Summits</dt><dd>{stats.summits}/{stats.climbs}</dd></div>
                <div><dt>Highest</dt><dd>{stats.best ? formatAltitude(CAMPS[stats.best - 1].altitude) : "—"}</dd></div>
                <div><dt>Streak</dt><dd>{stats.streak}</dd></div>
              </dl>
              <details className={styles.review}>
                <summary>The whole route</summary>
                <ol>
                  {camps.map((r, i) => {
                    const q = state.used.reroute === i ? r.swap : r.question;
                    return (
                      <li key={r.rung}>
                        <p className={styles.reviewCamp}>{CAMPS[i].name}, {formatAltitude(CAMPS[i].altitude)}</p>
                        <Question q={q} />
                        <p><strong>{q.answer}</strong> <span className={styles.quiet}>· {q.set || "QB Reader"}</span></p>
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
        Questions from <a href="https://www.qbreader.org">QB Reader</a>, written for quizbowl
        tournaments; altitude follows their difficulty. Subjects from Matthew Spry&rsquo;s QB-curricula.
      </footer>
    </div>,
  );
}
