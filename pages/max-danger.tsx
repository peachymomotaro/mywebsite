import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outfit, Press_Start_2P } from "next/font/google";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { createGame, dash, HEIGHT, jump, nextStage, STEP, stepGame, WIDTH, type Game, type GameEvent, type Input } from "../lib/max-escape/game";
import { drawGame } from "../lib/max-escape/draw";
import styles from "../styles/max-escape.module.css";

const body = Outfit({ subsets: ["latin"], display: "swap" });
const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel", display: "swap" });
gsap.registerPlugin(useGSAP);
const bestKey = "escape-from-max-best";
const snapshot = (g: Game) => ({
  status: g.status, score: g.score, gems: g.gems, lives: g.lives,
  time: Math.ceil(g.time), level: g.level, name: g.world.name, key: g.key,
  combo: g.combo, dashReady: g.dashCooldown === 0, shield: g.shield > 0,
  coffee: g.coffee > 0, message: g.messageTime > 0 ? g.message : "",
});

export default function MaxDanger() {
  const pageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createGame());
  const inputRef = useRef<Input>({ left: false, right: false });
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const bestRef = useRef(0);
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState(0);
  const [hud, setHud] = useState(() => snapshot(gameRef.current));
  const [canvasError, setCanvasError] = useState(false);
  const sync = useCallback(() => setHud(snapshot(gameRef.current)), []);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-logo]", { scale: .86, y: -12, opacity: 0, duration: .65, ease: "power3.out" });
    });
    return () => media.revert();
  }, { scope: pageRef });

  const tone = useCallback((event: GameEvent) => {
    const audio = audioRef.current;
    if (!soundRef.current || !audio || audio.state !== "running") return;
    const notes = event === "won" || event === "stageclear" ? [523, 659, 784, 1047] : event === "gem" ? [1047, 1568] : event === "key" || event === "checkpoint" ? [659, 880, 1047] : event === "hit" || event === "caught" ? [180, 90] : event === "dash" ? [180, 480] : event === "stomp" ? [120, 360] : [360, 540];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const time = audio.currentTime + i * .07;
      oscillator.type = event === "power" ? "triangle" : "square";
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(.025, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .12);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(time); oscillator.stop(time + .13);
    });
  }, []);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(bestKey));
      if (Number.isFinite(stored) && stored >= 0) { bestRef.current = stored; setBest(stored); }
    } catch { /* High scores are optional when storage is disabled. */ }
    const context = canvasRef.current?.getContext("2d");
    if (!context) { setCanvasError(true); return; }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0, accumulator = 0, lastHud = 0;
    const render = (now: number) => {
      const game = gameRef.current;
      const dt = last ? Math.min((now - last) / 1000, .08) : 0;
      last = now;
      if (game.status === "playing") {
        accumulator += dt;
        while (accumulator >= STEP) {
          stepGame(game, STEP, inputRef.current).forEach(tone);
          accumulator -= STEP;
          if (game.status !== "playing") {
            accumulator = 0;
            inputRef.current = { left: false, right: false };
            if (game.score > bestRef.current) {
              bestRef.current = game.score; setBest(game.score);
              try { localStorage.setItem(bestKey, String(game.score)); } catch { /* Optional score persistence. */ }
            }
            sync(); break;
          }
        }
      } else { accumulator = 0; if (game.status === "ready") game.elapsed += dt; }
      drawGame(context, game, reducedMotion.matches);
      if (now - lastHud > 90 && game.status === "playing") { sync(); lastHud = now; }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const autoPause = () => {
      inputRef.current = { left: false, right: false };
      if (gameRef.current.status === "playing") { gameRef.current.status = "paused"; sync(); }
    };
    const onVisibility = () => { if (document.hidden) autoPause(); };
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", autoPause);
      document.removeEventListener("visibilitychange", onVisibility);
      void audioRef.current?.close(); audioRef.current = null;
    };
  }, [sync, tone]);

  const focusGame = () => canvasRef.current?.focus({ preventScroll: true });
  const start = () => {
    inputRef.current = { left: false, right: false };
    gameRef.current = createGame(); gameRef.current.status = "playing";
    void audioRef.current?.resume().catch(() => {});
    sync(); focusGame();
  };
  const advance = () => { if (nextStage(gameRef.current)) { sync(); focusGame(); } };
  const togglePause = () => {
    const game = gameRef.current;
    if (game.status !== "playing" && game.status !== "paused") return;
    inputRef.current = { left: false, right: false };
    game.status = game.status === "playing" ? "paused" : "playing";
    sync(); focusGame();
  };
  const doJump = () => { const event = jump(gameRef.current); if (event) tone(event); };
  const doDash = () => { if (dash(gameRef.current)) tone("dash"); };
  const toggleSound = () => {
    const enabled = !soundRef.current;
    if (enabled) {
      try { audioRef.current ??= new AudioContext(); void audioRef.current.resume().catch(() => {}); } catch { return; }
    }
    soundRef.current = enabled; setSound(enabled); focusGame();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, a, input, textarea, select, summary")) return;
    const key = event.key.toLowerCase();
    if (["arrowleft", "a", "arrowright", "d"].includes(key)) {
      event.preventDefault(); inputRef.current[key === "arrowleft" || key === "a" ? "left" : "right"] = true;
    } else if ([" ", "arrowup", "w", "enter"].includes(key)) {
      event.preventDefault(); if (event.repeat) return;
      if (gameRef.current.status === "stageclear") advance();
      else if (["ready", "caught", "won"].includes(gameRef.current.status)) { if (!canvasError) start(); }
      else if (gameRef.current.status === "playing") doJump();
      else if (gameRef.current.status === "paused") togglePause();
    } else if (["shift", "x"].includes(key)) { event.preventDefault(); if (!event.repeat) doDash(); }
    else if (["p", "escape"].includes(key)) { event.preventDefault(); if (!event.repeat) togglePause(); }
    else if (key === "r" && !event.repeat && !canvasError) start();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "a"].includes(key)) inputRef.current.left = false;
    if (["arrowright", "d"].includes(key)) inputRef.current.right = false;
  };
  const keysRef = useRef({ onKeyDown, onKeyUp });
  useLayoutEffect(() => { keysRef.current = { onKeyDown, onKeyUp }; });
  useEffect(() => {
    const down = (event: KeyboardEvent) => keysRef.current.onKeyDown(event);
    const up = (event: KeyboardEvent) => keysRef.current.onKeyUp(event);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  const active = hud.status === "playing";
  const title = hud.status === "paused" ? "Paused" : hud.status === "caught" ? "Max got you!" : hud.status === "won" ? "You escaped!" : "Gate unlocked!";

  return <>
    <Head>
      <title>Max Danger</title>
      <meta name="description" content="An 8-bit jungle platform chase. Double-jump, dash, collect gems, and escape guitar-playing Max." />
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <link rel="canonical" href="https://petercurry.org/max-danger" />
      <meta property="og:title" content="Max Danger" />
    </Head>
    <main ref={pageRef} className={`${styles.page} ${body.className} ${pixel.variable}`} id="content">
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Game navigation"><Link href="/">Peter Curry</Link><span>Max Danger</span></nav>
        <section className={styles.arcade} aria-label="Max Danger game">
          <div className={styles.hud}>
            <div><span>1UP</span><strong>{String(hud.score).padStart(6,"0")}</strong></div>
            <div className={styles.hiScore}><span>HI-SCORE</span><strong>{String(best).padStart(6,"0")}</strong></div>
            <div><span>GEMS</span><strong>{String(hud.gems).padStart(2,"0")}{hud.combo > 1 && <small> x{hud.combo}</small>}</strong></div>
            <div><span>TIME</span><strong className={hud.time < 15 ? styles.warning : undefined}>{String(hud.time).padStart(2,"0")}</strong></div>
          </div>
          <div className={styles.screen}>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="Game field. Arrow keys or A D to move. Space to jump twice. X or Shift to dash. P to pause." aria-describedby="game-instructions">Your browser needs canvas support to play Max Danger.</canvas>
            {hud.status === "ready" ? <div className={styles.titleScreen}>
              <h1 className={styles.logo} data-logo>Max<br />Danger</h1>
              <p>Get the key. Dodge the snakes.<br />Don’t let Max catch you.</p>
              <button className={styles.startButton} onClick={start} disabled={canvasError}>{canvasError ? "Canvas unavailable" : "Start game"}</button>
              <span className={styles.enterHint}>or press Enter</span>
            </div> : hud.status !== "playing" && <div className={styles.overlay}>
              <div className={styles.resultPanel}>
                <h1>{title}</h1>
                <p>{hud.status === "paused" ? "Your escape can wait a moment." : hud.status === "won" ? "Three stages, one very tired guitarist. You made it home." : hud.status === "stageclear" ? `${hud.name} cleared. A fresh chance and a new challenge await.` : "Try the upper paths. Double-jump the gaps. Dash through the snakes."}</p>
                {hud.status !== "paused" && <strong className={styles.resultScore}>{hud.score.toLocaleString()} points</strong>}
                <button className={styles.startButton} onClick={hud.status === "paused" ? togglePause : hud.status === "stageclear" ? advance : start}>{hud.status === "paused" ? "Keep going" : hud.status === "stageclear" ? "Next stage" : "Try again"}</button>
              </div>
            </div>}
            {active && <>
              <div className={styles.stageInfo}><span>{hud.level + 1}/3 {hud.name}</span><span aria-label={`${hud.lives} chances left`}>LIFE {hud.lives}</span><span className={hud.key ? styles.hasKey : undefined}>{hud.key ? "KEY FOUND" : "FIND KEY"}</span></div>
              <div className={styles.powerStatus}>{hud.shield && <span>Shield</span>}{hud.coffee && <span>Espresso rush</span>}<span className={hud.dashReady ? styles.dashReady : undefined}>{hud.dashReady ? "Dash ready" : "Dash charging"}</span></div>
              {hud.message && <p className={styles.gameMessage}>{hud.message}</p>}
            </>}
          </div>
          <div className={styles.controls}>
            <div className={styles.directionControls}>
              {(["left", "right"] as const).map((direction) => <button key={direction} aria-label={`Move ${direction}`} disabled={!active} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); inputRef.current[direction] = true; focusGame(); }} onPointerUp={() => { inputRef.current[direction] = false; }} onPointerCancel={() => { inputRef.current[direction] = false; }} onLostPointerCapture={() => { inputRef.current[direction] = false; }} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") inputRef.current[direction] = true; }} onKeyUp={() => { inputRef.current[direction] = false; }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={direction === "left" ? "M15 4L7 12l8 8" : "M9 4l8 8-8 8"} /></svg></button>)}
            </div>
            <div className={styles.actionControls}>
              <button className={styles.dashButton} disabled={!active} aria-label="Dash" onPointerDown={(event) => { event.preventDefault(); doDash(); focusGame(); }} onClick={(event) => { if (event.detail === 0) doDash(); }}>Dash<span>X / Shift</span></button>
              <button className={styles.jumpButton} disabled={!active} aria-label="Jump" onPointerDown={(event) => { event.preventDefault(); doJump(); focusGame(); }} onClick={(event) => { if (event.detail === 0) doJump(); }}>Jump<span>Space x2</span></button>
            </div>
          </div>
          <div className={styles.utility}>
            <p id="game-instructions">Arrows / A D to move. Space twice to double-jump. X to dash.</p>
            <button onClick={toggleSound} aria-pressed={sound}>Sound {sound ? "on" : "off"}</button>
            <button onClick={togglePause} disabled={hud.status !== "playing" && hud.status !== "paused"}>{hud.status === "paused" ? "Resume" : "Pause"}</button>
            <button onClick={start} disabled={canvasError} aria-label="Restart game">Restart</button>
          </div>
        </section>
        <details className={styles.help}><summary>How to escape Max</summary><div>
          <p><strong>Explore.</strong> Find the golden key on the upper platforms, then reach the temple gate. Three stages stand between you and home.</p>
          <p><strong>Fight back.</strong> Jump on snakes to bounce off them, or dash straight through. Falling costs a life; flags save your checkpoint.</p>
          <p><strong>Get greedy.</strong> Chain gems for up to a 5x combo. Blue shields absorb a hit, coffee gives you a speed rush, and hearts restore a chance.</p>
        </div></details>
        <p className={styles.srOnly} role="status" aria-live="polite">{hud.status === "playing" ? `${hud.lives} chances left. ${hud.key ? "Key found." : "Find the key."} ${hud.message}` : hud.status === "ready" ? "Max Danger. Ready to play." : title}</p>
      </div>
    </main>
  </>;
}
MaxDanger.hideSiteLayout = true;
