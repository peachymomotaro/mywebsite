import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  INITIAL_TUNING, W, H, actionWorld, createWorld, drawWorld,
  getMetrics, interactWorld, stepWorld, type WorldId, type Tuning, type WorldState,
} from "../lib/complexity-lab/game";
import styles from "../styles/complexity-lab.module.css";

type Chapter = {
  id: WorldId; number: string; name: string; eyebrow: string; question: string;
  setup: string; mission: string; unit: string; lesson: string; tip: string;
  tool: string; answers: [string, string]; correct: number; explanation: string;
  controls: { key: keyof Tuning; title: string; detail: string }[];
  actions: { id: string; title: string }[];
};

const CHAPTERS: Chapter[] = [
  {
    id: "garden", number: "01", name: "The Garden", eyebrow: "Emergence",
    question: "Can something move when none of its parts do?",
    setup: "Each square follows just two rules: a living cell survives with two or three living neighbours; an empty cell is born with exactly three. The cells never travel, but patterns can.",
    mission: "Keep a population alive for 16 generations.",
    unit: "Unit 6 · Cellular Automata",
    lesson: "A system can exhibit motion, stability and elaborate structure even when all of its components follow the same local rule.",
    tip: "Click or drag to plant living cells. Right-click to erase. Add a glider, then watch for the same shape in a different place.",
    tool: "Plant life on the grid",
    answers: ["The pattern must stay in place", "The pattern can travel across the board"],
    correct: 1,
    explanation: "A glider recreates its shape in new cells over successive generations. No individual cell travels: the pattern does.",
    controls: [],
    actions: [{ id: "glider", title: "Plant glider" }, { id: "random", title: "Scatter seeds" }, { id: "clear", title: "Clear grid" }],
  },
  {
    id: "flock", number: "02", name: "The Flock", eyebrow: "Self-organisation",
    question: "Who leads a flock with no leader?",
    setup: "Every agent tries to avoid collisions, match nearby headings and stay close to neighbours. None receives instructions about where the entire flock should go.",
    mission: "Reach 75% local alignment after 70 frames.",
    unit: "Unit 7 · Models of Biological Self-Organization",
    lesson: "Coordinated group behaviour can emerge from local feedback. The balance of separation, alignment and cohesion determines what the group does.",
    tip: "Turn alignment up, then reduce cohesion and compare. Click anywhere to attract the flock to a point temporarily.",
    tool: "Click to set a temporary attractor",
    answers: ["More alignment usually raises local synchrony", "More alignment makes all movement random"],
    correct: 0,
    explanation: "Alignment is a local rule: agents adjust their headings toward nearby agents. A collective direction can arise without a central coordinator.",
    controls: [
      { key: "separation", title: "Separation", detail: "Avoid nearby agents" },
      { key: "alignment", title: "Alignment", detail: "Match nearby headings" },
      { key: "cohesion", title: "Cohesion", detail: "Move toward neighbours" },
    ],
    actions: [{ id: "gather", title: "Call to centre" }, { id: "scatter", title: "Scatter flock" }],
  },
  {
    id: "outbreak", number: "03", name: "The Outbreak", eyebrow: "Networks",
    question: "How does an infection cross four communities?",
    setup: "People have contacts inside their community, plus a few links between communities. Infectious people can transmit to susceptible neighbours for seven rounds. Recovery confers immunity.",
    mission: "Let the outbreak end with at least 60% never infected.",
    unit: "Unit 9 · Networks",
    lesson: "A small number of bridging connections can dramatically change the reach of a spreading process. Network structure matters alongside transmission probability.",
    tip: "Try fewer bridges, reduce transmission, or vaccinate susceptible people before running. Clicking a green person vaccinates them.",
    tool: "Click a green person to vaccinate",
    answers: ["Fewer bridges always increase spread", "Fewer bridges often reduce spread between groups"],
    correct: 1,
    explanation: "Bridges connect otherwise separated clusters. Reducing these links can contain cross-community transmission, though chance and local contact patterns also matter.",
    controls: [
      { key: "infection", title: "Transmission chance", detail: "Per infectious contact per round" },
      { key: "bridges", title: "Bridges", detail: "Cross-community links; resets the network" },
    ],
    actions: [{ id: "vaccinate", title: "Vaccinate 20%" }, { id: "reset", title: "New outbreak" }],
  },
  {
    id: "evolution", number: "04", name: "The Ecosystem", eyebrow: "Selection",
    question: "Can a population learn without any organism learning?",
    setup: "Each bar counts organisms with an inherited trait. Individuals whose traits match the habitat target tend to contribute more offspring; offspring vary through mutation.",
    mission: "Bring the population mean within 10 points of the habitat optimum after at least 10 generations.",
    unit: "Unit 5 · Genetic Algorithms",
    lesson: "Selection and variation can change a population over generations. This simplified natural-selection model introduces the mechanism that genetic algorithms adapt for computation.",
    tip: "Let the population approach the target, then shift the habitat suddenly. Click the chart to move the target as well.",
    tool: "Click to move the habitat optimum",
    answers: ["Moving the habitat target changes everyone immediately", "Moving the habitat target changes selection over generations"],
    correct: 1,
    explanation: "The current organisms do not instantly change. Different inherited variants have different reproductive success; the population distribution shifts across generations.",
    controls: [
      { key: "habitat", title: "Habitat optimum", detail: "Trait favoured by the environment" },
      { key: "mutation", title: "Variation", detail: "Size of inherited changes" },
    ],
    actions: [{ id: "shift", title: "Shift habitat" }, { id: "reset", title: "New population" }],
  },
  {
    id: "city", number: "05", name: "The City", eyebrow: "Collective outcomes",
    question: "Can mild preferences separate an entire city?",
    setup: "Two kinds of residents share a neighbourhood. Residents who find too few similar neighbours may move to an empty home that meets their preference. Nobody plans the city's overall pattern.",
    mission: "Reach 66% same-group neighbours with a preference of at most 45%, after 35 rounds.",
    unit: "Unit 8 · Models of Cooperation in Social Systems",
    lesson: "The gap between individual intentions and collective outcomes is central to agent-based modelling. This is a simplified Schelling-style segregation experiment.",
    tip: "Start with a 35% preference and watch the blue and gold patches grow. You can change a home by clicking it.",
    tool: "Click a home to cycle its occupant",
    answers: ["A 35% preference fixes the city at 35% similarity", "Mild preferences can lead to much higher segregation"],
    correct: 1,
    explanation: "Individual relocation decisions feed back on one another. Local preferences do not determine the final global percentage directly.",
    controls: [{ key: "similarity", title: "Preferred similarity", detail: "Minimum share of like neighbours" }],
    actions: [{ id: "mix", title: "Shuffle city" }],
  },
];
const COURSE = "https://www.complexityexplorer.org/courses/185-introduction-to-complexity";
const STORAGE = "complexity-lab-discoveries-v1";
const answerThreshold: Record<WorldId, number> = { garden: 8, flock: 40, outbreak: 7, evolution: 5, city: 18 };

export default function ComplexityLab() {
  const [world, setWorld] = useState<WorldId>("garden");
  const [tuning, setTuning] = useState<Tuning>({ ...INITIAL_TUNING });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [discovered, setDiscovered] = useState<WorldId[]>([]);
  const [answers, setAnswers] = useState<Partial<Record<WorldId, number>>>({});
  const simRef = useRef<WorldState>(createWorld("garden", INITIAL_TUNING));
  const tuningRef = useRef<Tuning>({ ...INITIAL_TUNING });
  const runningRef = useRef(true);
  const speedRef = useRef(1);
  const discoveredRef = useRef<WorldId[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState(() => getMetrics(simRef.current, tuningRef.current));
  const [canvasError, setCanvasError] = useState(false);

  const sync = useCallback(() => setMetrics(getMetrics(simRef.current, tuningRef.current)), []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(saved)) {
        const valid = saved.filter((id): id is WorldId => CHAPTERS.some(c => c.id === id));
        discoveredRef.current = valid; setDiscovered(valid);
      }
    } catch { /* Progress is optional when storage is disabled. */ }
  }, []);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) { setCanvasError(true); return; }
    setCanvasError(false);
    let frame = 0, last = 0, lastHud = 0;
    const loop = (now: number) => {
      const cadence = (world === "flock" ? 27 : world === "evolution" ? 280 : 125) / speedRef.current;
      if (!last) last = now;
      if (runningRef.current && now - last >= cadence) {
        const count = Math.min(6, Math.floor((now - last) / cadence));
        for (let i = 0; i < count; i++) stepWorld(simRef.current, tuningRef.current);
        last = now;
      } else if (!runningRef.current) last = now;
      drawWorld(ctx, simRef.current, tuningRef.current);
      if (now - lastHud >= 160) {
        const next = getMetrics(simRef.current, tuningRef.current);
        setMetrics(next);
        if (next.success && !discoveredRef.current.includes(world)) {
          const updated = [...discoveredRef.current, world];
          discoveredRef.current = updated; setDiscovered(updated);
          try { window.localStorage.setItem(STORAGE, JSON.stringify(updated)); } catch { /* Optional. */ }
        }
        lastHud = now;
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    const pauseOnHide = () => { if (document.hidden) { runningRef.current = false; setRunning(false); } };
    document.addEventListener("visibilitychange", pauseOnHide);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", pauseOnHide); };
  }, [world]);

  const switchTo = (id: WorldId) => {
    if (id === world) return;
    simRef.current = createWorld(id, tuningRef.current);
    setWorld(id); setRunning(true); runningRef.current = true;
    setMetrics(getMetrics(simRef.current, tuningRef.current));
  };
  const adjust = (key: keyof Tuning, value: number) => {
    const next = { ...tuningRef.current, [key]: value };
    tuningRef.current = next; setTuning(next);
    if (key === "bridges" && world === "outbreak") simRef.current = createWorld("outbreak", next);
    sync();
  };
  const act = (id: string) => {
    simRef.current = actionWorld(simRef.current, id, tuningRef.current);
    setTuning({ ...tuningRef.current }); sync();
  };
  const step = () => { setRunning(false); runningRef.current = false; stepWorld(simRef.current, tuningRef.current); sync(); };
  const point = (event: PointerEvent<HTMLCanvasElement>, erase = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W;
    const y = (event.clientY - rect.top) / rect.height * H;
    interactWorld(simRef.current, x, y, tuningRef.current, erase);
    setTuning({ ...tuningRef.current }); sync();
  };
  const chapter = CHAPTERS.find(c => c.id === world) || CHAPTERS[0];
  const complete = discovered.includes(world);
  const answered = answers[world] !== undefined;
  const reveal = answered && metrics && simRef.current.tick >= answerThreshold[world];

  return (
    <>
      <Head>
        <title>Small Rules, Big Worlds — An Interactive Complexity Lab</title>
        <meta name="description" content="Five playable experiments in emergence, flocking, networks, evolution and collective behaviour." />
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <link rel="canonical" href="https://petercurry.org/complexity-lab" />
      </Head>
      <main className={styles.page} id="content">
        <div className={styles.wrap}>
          <header className={styles.sitehead}>
            <Link href="/" className={styles.back}>Peter Curry</Link>
            <span className={styles.issue}>AN INTERACTIVE FIELD GUIDE <span>·</span> EXPERIMENT 001</span>
            <span className={styles.privateLabel}>UNLISTED</span>
          </header>

          <section className={styles.hero}>
            <div>
              <p className={styles.kicker}><span className={styles.spark}>✳</span> THE PATTERN OBSERVATORY</p>
              <h1>Small rules.<br /><em>Big worlds.</em></h1>
            </div>
            <div className={styles.heroRight}>
              <p>Five experiments. No central planner. A universe of consequences.</p>
              <p className={styles.heroSmall}>A playable companion to Melanie Mitchell’s <a href={COURSE} target="_blank" rel="noopener noreferrer">Introduction to Complexity</a> at the Santa Fe Institute’s Complexity Explorer. Independent teaching models, not official course software.</p>
              <div className={styles.progressLine}>
                <span><strong>{discovered.length}</strong> / 5 discoveries</span>
                <div className={styles.progressTrack}><span style={{ width: (discovered.length / 5 * 100) + "%" }} /></div>
              </div>
            </div>
          </section>

          <div className={styles.gameLayout}>
            <nav className={styles.chapters} aria-label="Choose an experiment">
              <div className={styles.sideHeading}>CHOOSE A WORLD <span>01 — 05</span></div>
              {CHAPTERS.map(c => (
                <button type="button" key={c.id} className={[styles.chapter, world === c.id ? styles.chapterActive : "", discovered.includes(c.id) ? styles.chapterWon : ""].join(" ")} onClick={() => switchTo(c.id)} aria-current={world === c.id ? "step" : undefined}>
                  <span className={styles.chapterNumber}>{c.number}</span>
                  <span className={styles.chapterNames}><strong>{c.name}</strong><small>{c.eyebrow}</small></span>
                  <span className={styles.check}>{discovered.includes(c.id) ? "✓" : "↗"}</span>
                </button>
              ))}
              <div className={styles.sideNote}>
                <strong>How to explore</strong>
                <p>Make a prediction. Change a rule. Run the model. Try to earn each field discovery.</p>
                <p>All five worlds are open from the start. Progress is saved on this device.</p>
              </div>
            </nav>

            <div className={styles.mainColumn}>
              <section className={styles.lab} aria-labelledby="lab-heading">
                <div className={styles.labHeading}>
                  <div><span className={styles.labEyebrow}>FIELD STUDY / {chapter.number} <span>—</span> {chapter.eyebrow}</span>
                    <h2 id="lab-heading">{chapter.name}</h2>
                  </div>
                  <span className={[styles.status, complete ? styles.statusDone : ""].join(" ")}>{complete ? "DISCOVERY MADE" : running ? "SIMULATION LIVE" : "SIMULATION PAUSED"}</span>
                </div>
                <div className={styles.canvasFrame}>
                  <canvas
                    ref={canvasRef} width={W} height={H} tabIndex={0}
                    aria-label={chapter.name + " interactive simulation. " + chapter.tool}
                    onPointerDown={event => { if (event.button !== 2) event.currentTarget.setPointerCapture(event.pointerId); point(event, event.button === 2); }}
                    onPointerMove={event => { if (world === "garden" && (event.buttons & 1 || event.buttons & 2)) point(event, Boolean(event.buttons & 2)); }}
                    onContextMenu={event => event.preventDefault()}
                  >Canvas is required for the simulation.</canvas>
                  <div className={styles.canvasTag}>{chapter.tool}</div>
                  {canvasError && <div className={styles.error}>Canvas unavailable in this browser. Try a modern browser to play.</div>}
                </div>
                <div className={styles.toolbar}>
                  <div className={styles.playControls}>
                    <button type="button" className={styles.primaryButton} onClick={() => setRunning(value => !value)} disabled={canvasError}>{running ? "Ⅱ  Pause" : "▶  Play"}</button>
                    <button type="button" onClick={step} disabled={canvasError}>Step +1</button>
                    <button type="button" onClick={() => act("reset")}>↺ Reset</button>
                  </div>
                  <div className={styles.speedControls} aria-label="Simulation speed">
                    <span>SPEED</span>
                    {[1, 2, 4].map(n => <button type="button" key={n} aria-pressed={speed === n} className={speed === n ? styles.selectedSpeed : ""} onClick={() => setSpeed(n)}>{n}×</button>)}
                  </div>
                </div>
                <div className={styles.metrics} aria-live="off">
                  {metrics.labels.map((label, i) => (
                    <div key={label}><span>{label}</span><strong>{i === 0 ? metrics.primary : i === 1 ? metrics.secondary : metrics.third}</strong></div>
                  ))}
                </div>
              </section>

              <section className={styles.mission} aria-labelledby="mission-heading">
                <div className={styles.sectionEyebrow}>THE FIELD MISSION</div>
                <div className={styles.missionRow}>
                  <div><h3 id="mission-heading">{complete ? "Discovery recorded." : "Your objective"}</h3><p>{chapter.mission}</p></div>
                  <div className={styles.missionSeal} aria-label={complete ? "Mission complete" : "Mission incomplete"}>{complete ? "✓" : chapter.number}</div>
                </div>
                <div className={styles.missionTrack}><span style={{ width: (complete ? 100 : metrics.progress * 100) + "%" }} /></div>
                <p className={styles.missionHint}>{complete ? "Your field notebook now contains this discovery. Try another set of rules, or move on." : metrics.hint}</p>
              </section>

              <section className={styles.questions} aria-labelledby="question-heading">
                <div className={styles.sectionEyebrow}>PREDICT → OBSERVE → EXPLAIN</div>
                <h3 id="question-heading">{chapter.question}</h3>
                <p className={styles.questionIntro}>Choose what you expect, then test it in the simulation.</p>
                <div className={styles.answers}>
                  {chapter.answers.map((answer, index) => (
                    <button type="button" key={answer} className={answers[world] === index ? styles.answerSelected : ""} onClick={() => setAnswers(old => ({ ...old, [world]: index }))} aria-pressed={answers[world] === index}>
                      <span>{index === 0 ? "A" : "B"}</span>{answer}
                    </button>
                  ))}
                </div>
                {answered && (
                  <div className={styles.answerFeedback} role="status">
                    {reveal ? <><strong>{answers[world] === chapter.correct ? "Your prediction matches this model." : "The model suggests the other outcome."}</strong><p>{chapter.explanation}</p></> : <p>Prediction recorded. Run the simulation for a few rounds to unlock the explanation.</p>}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.notes} aria-label="Experiment notes and controls">
              <div className={styles.noteTop}>
                <span className={styles.sectionEyebrow}>LAB NOTES / {chapter.number}</span>
                <h2>Try changing<br />one thing.</h2>
                <p>{chapter.setup}</p>
              </div>
              <section className={styles.controlsPanel} aria-label="Model controls">
                <h3>Change the rules</h3>
                {chapter.controls.map(control => (
                  <label className={styles.sliderRow} key={control.key}>
                    <span className={styles.sliderHeader}><strong>{control.title}</strong><output>{tuning[control.key]}%</output></span>
                    <input type="range" min="0" max="100" step="1" value={tuning[control.key]} onChange={event => adjust(control.key, Number(event.target.value))} />
                    <span className={styles.sliderHelp}>{control.detail}</span>
                  </label>
                ))}
                <div className={styles.actionGrid}>
                  {chapter.actions.map(action => <button type="button" key={action.id} onClick={() => act(action.id)}>{action.title}</button>)}
                </div>
                <p className={styles.tips}>{chapter.tip}</p>
              </section>
              <section className={styles.lecture}>
                <span className={styles.sectionEyebrow}>THE LECTURE CONNECTION</span>
                <p className={styles.unit}>{chapter.unit}</p>
                <p>{chapter.lesson}</p>
                <a href={COURSE} target="_blank" rel="noopener noreferrer">Open the free lecture series <span aria-hidden="true">↗</span></a>
              </section>
              <p className={styles.caveat}>These deliberately small, stochastic models are conceptual demonstrations, not empirical forecasts. Their rules and assumptions are shown in the notes and can be tested independently of the course.</p>
            </aside>
          </div>
          <footer className={styles.footer}>
            <p><strong>THE PATTERN OBSERVATORY</strong> / A playful investigation of complexity</p>
            <p>Made as an independent companion to <a href={COURSE} target="_blank" rel="noopener noreferrer">Melanie Mitchell’s Introduction to Complexity</a>. No affiliation with the Santa Fe Institute.</p>
          </footer>
        </div>
      </main>
    </>
  );
}
ComplexityLab.hideSiteLayout = true;
