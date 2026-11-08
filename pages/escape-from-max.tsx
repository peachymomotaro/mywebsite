import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, FINISH, HEIGHT, jump, stepGame, WIDTH, type GameEvent, type Status } from "../lib/max-escape/game";
import { drawGame } from "../lib/max-escape/draw";
import styles from "../styles/max-escape.module.css";

const bestKey = "escape-from-max-best";
const messages: Record<Status, string> = {
  ready: "A little girl. A big head start.",
  playing: "Keep going! Home is just down the path.",
  paused: "Take a breather.",
  caught: "Max caught up!",
  won: "Home, sweet home!",
};

export default function EscapeFromMax() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createGame());
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const bestRef = useRef(0);
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState(0);
  const [hud, setHud] = useState({ status: "ready" as Status, distance: 0, stars: 0, lives: 3 });
  const [canvasError, setCanvasError] = useState(false);

  const sync = useCallback(() => {
    const game = gameRef.current;
    setHud({ status: game.status, distance: Math.floor(game.distance / 10), stars: game.stars, lives: game.lives });
  }, []);

  const tone = useCallback((event: GameEvent) => {
    const audio = audioRef.current;
    if (!soundRef.current || !audio || audio.state !== "running") return;
    const notes = event === "won" ? [523, 659, 784, 1047] : event === "star" ? [880, 1320] : event === "hit" || event === "caught" ? [180, 110] : [360, 540];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const time = audio.currentTime + index * 0.085;
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0.025, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.13);
    });
  }, []);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(bestKey));
      if (Number.isFinite(stored) && stored >= 0) {
        bestRef.current = stored;
        setBest(stored);
      }
    } catch { /* The game still works when browser storage is unavailable. */ }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) {
      setCanvasError(true);
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    let accumulator = 0;
    let lastHud = 0;
    let lastDrawnStatus: Status | null = null;
    const render = (now: number) => {
      const game = gameRef.current;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (game.status === "playing") {
        accumulator += dt;
        while (accumulator >= 1 / 120) {
          const events = stepGame(game, 1 / 120);
          events.forEach(tone);
          accumulator -= 1 / 120;
          if (game.status !== "playing") {
            accumulator = 0;
            const score = Math.floor(game.distance / 10) + game.stars * 10;
            if (score > bestRef.current) {
              bestRef.current = score;
              setBest(score);
              try { localStorage.setItem(bestKey, String(score)); } catch { /* Optional high score. */ }
            }
            sync();
            break;
          }
        }
      } else accumulator = 0;
      if (game.status === "playing" || game.status !== lastDrawnStatus) drawGame(ctx, game, reducedMotion);
      lastDrawnStatus = game.status;
      if (now - lastHud > 100 && game.status === "playing") {
        sync();
        lastHud = now;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const autoPause = () => {
      if (gameRef.current.status === "playing") {
        gameRef.current.status = "paused";
        sync();
      }
    };
    const onVisibility = () => { if (document.hidden) autoPause(); };
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", autoPause);
      document.removeEventListener("visibilitychange", onVisibility);
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, [sync, tone]);

  const focusGame = () => canvasRef.current?.focus({ preventScroll: true });
  const start = () => {
    gameRef.current = createGame();
    gameRef.current.status = "playing";
    void audioRef.current?.resume().catch(() => {});
    sync();
    focusGame();
  };
  const togglePause = () => {
    const game = gameRef.current;
    if (game.status !== "playing" && game.status !== "paused") return;
    game.status = game.status === "playing" ? "paused" : "playing";
    sync();
    focusGame();
  };
  const doJump = () => {
    if (jump(gameRef.current)) tone("jump");
  };
  const toggleSound = () => {
    const enabled = !soundRef.current;
    if (enabled) {
      try {
        audioRef.current ??= new AudioContext();
        void audioRef.current.resume().catch(() => {});
      } catch { return; }
    }
    soundRef.current = enabled;
    setSound(enabled);
    focusGame();
  };
  const overlay = hud.status !== "playing";
  const score = hud.distance + hud.stars * 10;

  return (
    <>
      <Head>
        <title>Escape from Max — Peter Curry</title>
        <meta name="description" content="A tiny 8-bit chase game. Jump rocks, collect stars, and help a young blond girl outrun floppy-haired Max. Play free with keyboard or touch." />
      </Head>
      <main className={styles.page} id="content">
        <div className={styles.shell}>
          <nav className={styles.nav} aria-label="Game navigation">
            <Link href="/projects">← Peter Curry / Projects</Link>
            <span>THE TINY ARCADE <span aria-hidden="true">✳</span> NO. 01</span>
          </nav>
          <header className={styles.header}>
            <p className={styles.eyebrow}>A SMALL GAME OF GETTING AWAY</p>
            <h1>ESCAPE FROM <span>MAX<span className={styles.period}>.</span></span></h1>
            <p>Floppy hair. Fast feet. Don’t let him catch you.</p>
          </header>

          <section className={styles.machine} aria-label="Escape from Max game" onKeyDown={(event) => {
            if (event.target instanceof HTMLButtonElement) return;
            const key = event.key.toLowerCase();
            if ([" ", "arrowup", "w"].includes(key)) {
              event.preventDefault();
              if (event.repeat) return;
              if (gameRef.current.status === "ready" || gameRef.current.status === "caught" || gameRef.current.status === "won") start();
              else if (gameRef.current.status === "playing") doJump();
            } else if (["p", "escape"].includes(key)) {
              event.preventDefault();
              if (!event.repeat) togglePause();
            } else if (key === "r" && !event.repeat) start();
          }}>
            <div className={styles.hud}>
              <div><span className={styles.hudLabel}>HEAD START</span><span className={styles.hearts} aria-label={`${hud.lives} of 3 chances left`}>{"♥".repeat(hud.lives)}<span>{"♡".repeat(3 - hud.lives)}</span></span></div>
              <div><span className={styles.hudLabel}>STARS</span><span className={styles.hudValue}><span className={styles.gold}>✦</span> {String(hud.stars).padStart(2, "0")}<span className={styles.hudMuted}> / 14</span></span></div>
              <div className={styles.distance}><span className={styles.hudLabel}>DISTANCE</span><span className={styles.hudValue}>{String(hud.distance).padStart(3, "0")}<span className={styles.hudMuted}> / 420 m</span></span></div>
            </div>
            <div className={styles.stage}>
              <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="Game field. Space, up arrow, or W to jump. P or Escape to pause. R to restart." aria-describedby="game-instructions" onPointerDown={(event) => {
                if (gameRef.current.status === "playing") {
                  event.preventDefault();
                  focusGame();
                  doJump();
                }
              }}>Your browser needs canvas support to play Escape from Max.</canvas>
              {overlay && <div className={styles.overlay}>
                <div className={styles.overlayPanel}>
                  <span className={styles.overlayKicker}>{hud.status === "ready" ? "READY, SET…" : hud.status === "won" ? "YOU MADE IT" : hud.status === "paused" ? "PAUSED" : "ONE MORE GO?"}</span>
                  <h2>{messages[hud.status]}</h2>
                  <p>{canvasError ? "Canvas is unavailable. Try opening this page in another browser." : hud.status === "ready" ? "Jump the rocks. Grab the stars. Get home before Max catches up." : hud.status === "won" ? `All 420 metres! ${hud.stars} of 14 stars. ${score} points. Max will have to catch his breath.` : hud.status === "caught" ? `${hud.distance} metres, ${hud.stars} stars. Those rocks won’t jump themselves.` : "Your head start is safe. Pick up where you left off."}</p>
                  <button className={styles.primary} disabled={canvasError} onClick={hud.status === "paused" ? togglePause : start}>{hud.status === "ready" ? "LET’S RUN" : hud.status === "paused" ? "KEEP RUNNING" : "RUN AGAIN"} <span aria-hidden="true">→</span></button>
                  {hud.status === "ready" && <span className={styles.startHint}>or focus the game and press Space</span>}
                </div>
              </div>}
            </div>
            <div className={styles.progress} role="progressbar" aria-label="Distance to home" aria-valuemin={0} aria-valuemax={420} aria-valuenow={hud.distance}>
              <span style={{ width: `${hud.distance / (FINISH / 10) * 100}%` }} />
            </div>
            <div className={styles.console}>
              <div className={styles.controlHint}><kbd>SPACE</kbd> <span>to jump</span><span className={styles.or}>/</span><kbd>↑</kbd></div>
              <div className={styles.utility}>
                <button onClick={toggleSound} aria-pressed={sound}>SOUND {sound ? "ON" : "OFF"}</button>
                <button onClick={togglePause} disabled={hud.status !== "playing" && hud.status !== "paused"}>{hud.status === "paused" ? "RESUME" : "PAUSE"}</button>
                <button onClick={start} disabled={canvasError} aria-label="Restart game">↺ <span className={styles.restartLabel}>RESTART</span></button>
              </div>
            </div>
          </section>

          <div className={styles.below}>
            <p id="game-instructions"><strong>One button. A little timing.</strong> You run automatically. Press Space, ↑ or W, tap the scene, or use the jump button. Hit three rocks and Max catches up. Stars add 10 points.</p>
            <div className={styles.jumpControl}><button onPointerDown={(event) => { event.preventDefault(); doJump(); focusGame(); }} onClick={(event) => { if (event.detail === 0) doJump(); }} disabled={hud.status !== "playing"}>JUMP <span aria-hidden="true">↑</span></button></div>
            <div className={styles.best}><span>PERSONAL BEST</span><strong>{String(best).padStart(3, "0")}</strong><span>POINTS · THIS BROWSER</span></div>
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">{messages[hud.status]} {hud.lives} chances left. {hud.status === "caught" || hud.status === "won" ? `${score} points.` : ""}</p>
          <footer className={styles.footer}><span>8-BIT LEGS. VERY REAL DETERMINATION.</span><Link href="/projects">More things I’ve made ↗</Link></footer>
        </div>
      </main>
    </>
  );
}

EscapeFromMax.hideSiteLayout = true;
