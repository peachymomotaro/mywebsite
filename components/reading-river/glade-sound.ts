"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The sound of the glade. Smetana's Vltava plays softly, then
 * there's a long quiet spell before it comes round again. Under it, quietly,
 * running water (a little clearer by the river, faint up on the bank). Birds
 * calling now and then, and rain as you come near the shower, are made in the
 * browser with Web Audio.
 *
 * The music plays as an ordinary audio element, not routed through Web Audio:
 * some browsers (Safari especially) turn a media element fed into Web Audio
 * into a whine and cut out the other sounds.
 *
 * Browsers only allow sound after a tap or key press, so it starts then,
 * fading in gently. The visitor's on/off choice is remembered.
 */

export type GladeSurroundings = {
  /** How far you are from the river's water, in glade units. */
  river: number;
  /** How far you are from the rain shower. */
  rain: number;
};

const PREFERENCE_KEY = "reading-river:sound";

/**
 * Vltava (The Moldau), from Má vlast by Bedřich Smetana, performed by the
 * Musopen Symphony Orchestra. The recording is released under CC0 and has
 * been compressed and loudness-matched for the web. Credited on How It Works.
 */
const MUSIC = "/reading-river/music/vltava.m4a?v=2";
/** The music's volume (0 to 1) at its loudest. */
const MUSIC_LEVEL = 0.35;
/** Between one playing and the next: a while of just the river. */
const QUIET_SPELL_MS: [number, number] = [50_000, 100_000];
/**
 * Running water, looped: a 26 s seamless loop (the end crossfaded into the
 * start). WAV rather than a compressed format, so there's no gap where it wraps.
 */
const RIVER_LOOP = "/reading-river/music/river.wav";
const MASTER_LEVEL = 0.7;

type Engine = {
  context: AudioContext;
  master: GainNode;
  river: GainNode;
  rain: GainNode;
  music: MusicPlayer;
  stop: () => void;
};

function readPreference() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writePreference(on: boolean) {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, on ? "on" : "off");
  } catch {
    // Private windows may refuse; the choice just won't be remembered.
  }
}

/** A few seconds of white noise to loop: the raw stuff of the rain's hiss. */
function noiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(2, Math.floor(context.sampleRate * seconds), context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.5;
  }
  return buffer;
}

type MusicPlayer = {
  /** How loud the music should be now, 0 (silent, paused) to 1. */
  setLevel: (level: number) => void;
  stop: () => void;
};

/**
 * The music, on a plain audio element whose volume eases toward where it
 * should be. When it has faded right out it pauses, and picks up again where
 * it left off.
 */
function startMusic(): MusicPlayer {
  const player = new Audio(MUSIC);
  player.preload = "auto";
  player.volume = 0;
  let target = 0;
  /** True while the piece is under way, rather than in the quiet between. */
  let underWay = true;
  let waiting: number | null = null;
  let stopped = false;

  const begin = () => {
    waiting = null;
    underWay = true;
    player.currentTime = 0;
    if (target > 0) void player.play().catch(() => undefined);
  };
  player.addEventListener("ended", () => {
    underWay = false;
    const [low, high] = QUIET_SPELL_MS;
    waiting = window.setTimeout(begin, low + Math.random() * (high - low));
  });
  // Unlock the media element inside the first tap/key event. Delaying play
  // until a timer loses that permission in browsers with strict autoplay rules.
  void player.play().catch(() => undefined);

  const ease = window.setInterval(() => {
    if (stopped) return;
    const goal = target * MUSIC_LEVEL;
    const next = player.volume + (goal - player.volume) * 0.12;
    player.volume = Math.min(1, Math.max(0, Math.abs(goal - next) < 0.002 ? goal : next));
    if (target === 0 && player.volume === 0 && !player.paused) player.pause();
    if (target > 0 && underWay && player.paused) void player.play().catch(() => undefined);
  }, 100);

  return {
    setLevel: (level) => { target = Math.min(1, Math.max(0, level)); },
    stop: () => {
      stopped = true;
      window.clearInterval(ease);
      if (waiting !== null) window.clearTimeout(waiting);
      player.pause();
      player.removeAttribute("src");
      player.load();
    },
  };
}

function startEngine(): Engine | null {
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  const context = new Context();
  const master = context.createGain();
  master.gain.value = 0;
  // Safety on the way out: block any steady offset (which speakers turn into a
  // harsh blare), then a limiter, so nothing here can ever get loud.
  const blockOffset = context.createBiquadFilter();
  blockOffset.type = "highpass";
  blockOffset.frequency.value = 35;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -24;
  limiter.knee.value = 6;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  const ceiling = context.createGain();
  ceiling.gain.value = 0.8;
  master.connect(blockOffset).connect(limiter).connect(ceiling).connect(context.destination);
  master.gain.setTargetAtTime(MASTER_LEVEL, context.currentTime, 1.4);
  const timers: number[] = [];

  // The river: running water, softly, looped. Fetched once sound has begun.
  const river = context.createGain();
  river.gain.value = 0;
  river.connect(master);
  void fetch(RIVER_LOOP)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      if (context.state === "closed") return;
      const water = context.createBufferSource();
      water.buffer = buffer;
      water.loop = true;
      water.connect(river);
      water.start();
    })
    .catch(() => undefined);

  // Rain: a hiss, only near the shower.
  const rain = context.createGain();
  rain.gain.value = 0;
  rain.connect(master);
  const hiss = context.createBufferSource();
  hiss.buffer = noiseBuffer(context, 4);
  hiss.loop = true;
  const high = context.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 1800;
  const soft = context.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 7000;
  hiss.connect(high).connect(soft).connect(rain);
  hiss.start();

  // Birds: now and then a short phrase of chirps, somewhere off to one side.
  const birds = context.createGain();
  birds.gain.value = 0.5;
  birds.connect(master);
  const sing = () => {
    const pan = context.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(birds);
    const pitch = 2400 + Math.random() * 1800;
    const notes = 2 + Math.floor(Math.random() * 5);
    let at = context.currentTime + 0.05;
    for (let note = 0; note < notes; note += 1) {
      const tone = context.createOscillator();
      tone.type = "sine";
      const length = 0.05 + Math.random() * 0.09;
      const from = pitch * (0.85 + Math.random() * 0.3);
      tone.frequency.setValueAtTime(from, at);
      tone.frequency.exponentialRampToValueAtTime(from * (Math.random() > 0.5 ? 1.35 : 0.7), at + length);
      const envelope = context.createGain();
      envelope.gain.value = 0;
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.025, at + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
      tone.connect(envelope).connect(pan);
      tone.start(at);
      tone.stop(at + length + 0.02);
      at += length + 0.04 + Math.random() * 0.12;
    }
    timers.push(window.setTimeout(sing, 6000 + Math.random() * 14000));
  };
  timers.push(window.setTimeout(sing, 2500));

  const music = startMusic();

  return {
    context, master, river, rain, music,
    stop: () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      music.stop();
      void context.close();
    },
  };
}

const smoothstep = (value: number, low: number, high: number) => {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** Sound on or off, started on the first tap or key press, following where you are. */
export function useGladeSound() {
  const [on, setOn] = useState(true);
  const [supported, setSupported] = useState(false);
  const engineRef = useRef<Engine | null>(null);
  const onRef = useRef(true);
  const surroundingsRef = useRef<GladeSurroundings>({ river: 6, rain: 999 });

  const apply = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const { river, rain } = surroundingsRef.current;
    const now = engine.context.currentTime;
    const audible = onRef.current && !document.hidden;
    // Quiet: a little clearer right by the water, faint up on the bank.
    engine.river.gain.setTargetAtTime(0.21 + 0.35 * (1 - smoothstep(river, 2, 35)), now, 0.8);
    const underRain = 1 - smoothstep(rain, 6, 30);
    engine.rain.gain.setTargetAtTime(0.16 * underRain, now, 0.8);
    // The rain drowns the music a little, as it would.
    engine.music.setLevel(audible ? 1 - underRain * 0.5 : 0);
  }, []);

  const start = useCallback(() => {
    if (engineRef.current || !onRef.current) return;
    engineRef.current = startEngine();
    apply();
  }, [apply]);

  useEffect(() => {
    const AudioSupport = typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
    setSupported(AudioSupport);
    if (!AudioSupport) return;
    const preferred = readPreference();
    onRef.current = preferred;
    setOn(preferred);
    const begin = () => start();
    window.addEventListener("pointerdown", begin);
    window.addEventListener("keydown", begin);
    // Quiet while the tab is hidden.
    const onVisibility = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (document.hidden) void engine.context.suspend();
      else if (onRef.current) void engine.context.resume();
      apply();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
      document.removeEventListener("visibilitychange", onVisibility);
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, [start, apply]);

  const toggle = useCallback(() => {
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    writePreference(next);
    const engine = engineRef.current;
    if (!next) {
      if (engine) {
        engine.master.gain.setTargetAtTime(0, engine.context.currentTime, 0.3);
        apply();
        window.setTimeout(() => { if (!onRef.current) void engine.context.suspend(); }, 1200);
      }
      return;
    }
    if (!engine) { start(); return; }
    void engine.context.resume();
    engine.master.gain.setTargetAtTime(MASTER_LEVEL, engine.context.currentTime, 1);
    apply();
  }, [start, apply]);

  const hear = useCallback((surroundings: GladeSurroundings) => {
    surroundingsRef.current = surroundings;
    apply();
  }, [apply]);

  return { on, supported, toggle, hear };
}
