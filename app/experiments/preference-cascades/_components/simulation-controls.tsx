"use client";

import { useEffect, useState } from "react";

export const percent = (value: number) => `${value.toFixed(1).replace(/\.0$/, "")}%`;

export function usePlayback(history: readonly number[]) {
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const atEnd = round >= history.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = window.setTimeout(() => {
      setRound(round + 1);
      if (round + 1 >= history.length - 1) setPlaying(false);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [playing, round, atEnd, history.length]);

  return {
    round,
    current: history[Math.min(round, history.length - 1)],
    playing: playing && !atEnd,
    atEnd,
    canReplay: history.length > 1,
    toggle() {
      if (atEnd) setRound(0);
      setPlaying((value) => !value);
    },
    step() { setPlaying(false); setRound((value) => Math.min(value + 1, history.length - 1)); },
    reset() { setPlaying(false); setRound(0); },
  };
}

export function SimulationControls({ playback }: { playback: ReturnType<typeof usePlayback> }) {
  return (
    <div className="pc-actions">
      <button className="button pc-play" type="button" onClick={playback.toggle} disabled={playback.atEnd && !playback.canReplay}>
        {playback.playing ? "Pause" : playback.atEnd ? "Replay" : "Play"}
      </button>
      <button className="button" type="button" onClick={playback.step} disabled={playback.atEnd}>Step</button>
      <button className="button" type="button" onClick={playback.reset}>Reset</button>
    </div>
  );
}
