"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type XY = {
  x: number;
  y: number;
};

type Sample = XY & {
  value: number;
};

type Bump = {
  cx: number;
  cy: number;
  amp: number;
  width: number;
};

type Landscape = {
  seed: number;
  bumps: Bump[];
  rippleA: number;
  rippleFx: number;
  rippleFy: number;
  min: number;
  max: number;
  optimum: Sample;
};

type OverlayMode = "unknown" | "belief" | "uncertainty" | "acquisition" | "truth";
type OptimiserMode = "portfolio" | "greedy" | "curious";

type GPModel = {
  observations: Sample[];
  yMean: number;
  lengthScale: number;
  L: number[][];
  alpha: number[];
};

type CandidateEvaluation = XY & {
  mean: number;
  std: number;
  ei: number;
  ucbExplore: number;
  ucbBalanced: number;
  ucbExploit: number;
  localTrust: number;
  novelty: number;
  portfolioScore: number;
};

const TURNS_PER_GAME = 10;
const CANVAS_RESOLUTION = 120;
const CANDIDATE_GRID_SIZE = 48;
const MIN_CANDIDATE_DISTANCE = 0.026;
const DEFAULT_LENGTH_SCALE = 0.115;
const DEFAULT_NOISE = 1e-5;

const STARTING_POINTS: XY[] = [
  { x: 0.16, y: 0.18 },
  { x: 0.78, y: 0.2 },
  { x: 0.48, y: 0.78 },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function squaredDistance(a: XY, b: XY): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distance(a: XY, b: XY): number {
  return Math.sqrt(squaredDistance(a, b));
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function rawLandscapeValue(
  x: number,
  y: number,
  landscape: Omit<Landscape, "min" | "max" | "optimum">,
): number {
  let value = 0;

  for (const bump of landscape.bumps) {
    const r2 = (x - bump.cx) ** 2 + (y - bump.cy) ** 2;
    value += bump.amp * Math.exp(-r2 / bump.width);
  }

  value += landscape.rippleA * Math.sin(landscape.rippleFx * Math.PI * x) * Math.cos(landscape.rippleFy * Math.PI * y);
  value += 0.04 * Math.sin(11 * Math.PI * (x + y));

  return value;
}

function createLandscape(seed: number): Landscape {
  const random = mulberry32(seed);
  const base = {
    seed,
    bumps: [
      {
        cx: 0.15 + 0.7 * random(),
        cy: 0.15 + 0.7 * random(),
        amp: 1.2,
        width: 0.018 + 0.018 * random(),
      },
      {
        cx: 0.15 + 0.7 * random(),
        cy: 0.15 + 0.7 * random(),
        amp: 0.88,
        width: 0.012 + 0.02 * random(),
      },
      {
        cx: 0.1 + 0.8 * random(),
        cy: 0.1 + 0.8 * random(),
        amp: 0.45 + 0.25 * random(),
        width: 0.05 + 0.06 * random(),
      },
      {
        cx: 0.1 + 0.8 * random(),
        cy: 0.1 + 0.8 * random(),
        amp: -0.25 - 0.25 * random(),
        width: 0.02 + 0.06 * random(),
      },
    ],
    rippleA: 0.06 + 0.03 * random(),
    rippleFx: 3 + Math.floor(4 * random()),
    rippleFy: 3 + Math.floor(4 * random()),
  };

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let best: Sample = { x: 0, y: 0, value: Number.NEGATIVE_INFINITY };

  for (let iy = 0; iy < 160; iy += 1) {
    for (let ix = 0; ix < 160; ix += 1) {
      const x = ix / 159;
      const y = iy / 159;
      const value = rawLandscapeValue(x, y, base);
      min = Math.min(min, value);
      max = Math.max(max, value);
      if (value > best.value) {
        best = { x, y, value };
      }
    }
  }

  return {
    ...base,
    min,
    max,
    optimum: {
      x: best.x,
      y: best.y,
      value: 1,
    },
  };
}

function objective(x: number, y: number, landscape: Landscape): number {
  const raw = rawLandscapeValue(x, y, landscape);
  return clamp01((raw - landscape.min) / Math.max(landscape.max - landscape.min, 1e-9));
}

function makeSample(point: XY, landscape: Landscape): Sample {
  const x = clamp01(point.x);
  const y = clamp01(point.y);
  return {
    x,
    y,
    value: objective(x, y, landscape),
  };
}

function rbfKernel(a: XY, b: XY, lengthScale = DEFAULT_LENGTH_SCALE): number {
  return Math.exp(-squaredDistance(a, b) / (2 * lengthScale * lengthScale));
}

function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = 0;
      for (let k = 0; k < j; k += 1) {
        sum += L[i][k] * L[j][k];
      }
      L[i][j] = i === j
        ? Math.sqrt(Math.max(matrix[i][i] - sum, 1e-12))
        : (matrix[i][j] - sum) / L[j][j];
    }
  }

  return L;
}

function solveLowerTriangular(L: number[][], b: number[]): number[] {
  const n = L.length;
  const x = Array(n).fill(0);

  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    for (let j = 0; j < i; j += 1) {
      sum += L[i][j] * x[j];
    }
    x[i] = (b[i] - sum) / L[i][i];
  }

  return x;
}

function solveUpperTriangularFromLowerTranspose(L: number[][], b: number[]): number[] {
  const n = L.length;
  const x = Array(n).fill(0);

  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = 0;
    for (let j = i + 1; j < n; j += 1) {
      sum += L[j][i] * x[j];
    }
    x[i] = (b[i] - sum) / L[i][i];
  }

  return x;
}

function fitGP(observations: Sample[]): GPModel | null {
  if (observations.length === 0) return null;

  const n = observations.length;
  const yMean = observations.reduce((sum, obs) => sum + obs.value, 0) / n;
  const centeredY = observations.map((obs) => obs.value - yMean);
  const K = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const base = rbfKernel(observations[i], observations[j]);
      return i === j ? base + DEFAULT_NOISE : base;
    }),
  );

  const L = cholesky(K);
  const tmp = solveLowerTriangular(L, centeredY);
  const alpha = solveUpperTriangularFromLowerTranspose(L, tmp);

  return {
    observations,
    yMean,
    lengthScale: DEFAULT_LENGTH_SCALE,
    L,
    alpha,
  };
}

function predictGP(model: GPModel | null, point: XY): { mean: number; std: number; variance: number } {
  if (!model || model.observations.length === 0) {
    return { mean: 0.5, std: 1, variance: 1 };
  }

  const kStar = model.observations.map((obs) => rbfKernel(obs, point, model.lengthScale));
  const mean = model.yMean + kStar.reduce((sum, k, i) => sum + k * model.alpha[i], 0);
  const v = solveLowerTriangular(model.L, kStar);
  const variance = Math.max(1 - v.reduce((sum, vi) => sum + vi * vi, 0), 1e-8);

  return {
    mean: clamp01(mean),
    std: Math.sqrt(variance),
    variance,
  };
}

function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

function erfApprox(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erfApprox(z / Math.SQRT2));
}

function expectedImprovement(mean: number, std: number, bestValue: number): number {
  const safeStd = Math.max(std, 1e-8);
  const improvement = mean - bestValue;
  const z = improvement / safeStd;
  return Math.max(improvement * normalCdf(z) + safeStd * normalPdf(z), 0);
}

function normalise(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-12);
  return values.map((value) => (value - min) / span);
}

function acquisitionScore(prediction: { mean: number; std: number }, mode: OptimiserMode, turn: number): number {
  if (mode === "greedy") return prediction.mean;
  if (mode === "curious") return prediction.std;

  const progress = turn / Math.max(1, TURNS_PER_GAME - 1);
  const beta = 1.45 - 0.6 * progress;
  return prediction.mean + beta * prediction.std;
}

function generateCandidateGrid(size = CANDIDATE_GRID_SIZE): XY[] {
  const candidates: XY[] = [];

  for (let iy = 0; iy < size; iy += 1) {
    for (let ix = 0; ix < size; ix += 1) {
      candidates.push({
        x: ix / (size - 1),
        y: iy / (size - 1),
      });
    }
  }

  return candidates;
}

function bestSample(samples: Sample[]): Sample | null {
  if (samples.length === 0) return null;
  return samples.reduce((best, sample) => (sample.value > best.value ? sample : best), samples[0]);
}

function generateLocalCandidates(observations: Sample[]): XY[] {
  const best = bestSample(observations);
  if (!best) return [];

  const candidates: XY[] = [];
  const radii = [0.025, 0.045, 0.07, 0.1, 0.14];
  const angles = 18;

  for (const radius of radii) {
    for (let i = 0; i < angles; i += 1) {
      const theta = (2 * Math.PI * i) / angles;
      candidates.push({
        x: clamp01(best.x + radius * Math.cos(theta)),
        y: clamp01(best.y + radius * Math.sin(theta)),
      });
    }
  }

  return candidates;
}

function generatePortfolioCandidates(observations: Sample[]): XY[] {
  const candidates = [...generateCandidateGrid(), ...generateLocalCandidates(observations)];
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.x.toFixed(4)}:${candidate.y.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evaluateCandidates(observations: Sample[], mode: OptimiserMode, turn: number): CandidateEvaluation[] {
  const model = fitGP(observations);
  const best = bestSample(observations);
  const bestValue = best?.value ?? 0;
  const progress = turn / Math.max(1, TURNS_PER_GAME - 1);

  const raw = generatePortfolioCandidates(observations)
    .filter((candidate) => !observations.some((obs) => distance(obs, candidate) < MIN_CANDIDATE_DISTANCE))
    .map((candidate) => {
      const prediction = predictGP(model, candidate);
      const nearestDistance = observations.length
        ? Math.min(...observations.map((obs) => distance(obs, candidate)))
        : 1;
      const trustRegion = best ? Math.exp(-squaredDistance(candidate, best) / (2 * 0.11 * 0.11)) : 0;
      const localTrust = 0.65 * prediction.mean + 0.35 * trustRegion;

      return {
        ...candidate,
        mean: prediction.mean,
        std: prediction.std,
        ei: expectedImprovement(prediction.mean, prediction.std, bestValue),
        ucbExplore: prediction.mean + 1.75 * prediction.std,
        ucbBalanced: prediction.mean + (1.35 - 0.5 * progress) * prediction.std,
        ucbExploit: prediction.mean + 0.45 * prediction.std,
        localTrust,
        novelty: nearestDistance,
        portfolioScore: 0,
      };
    });

  if (raw.length === 0) return [];

  if (mode !== "portfolio") {
    return raw.map((candidate) => ({
      ...candidate,
      portfolioScore: acquisitionScore({ mean: candidate.mean, std: candidate.std }, mode, turn),
    }));
  }

  const ei = normalise(raw.map((candidate) => candidate.ei));
  const ucbExplore = normalise(raw.map((candidate) => candidate.ucbExplore));
  const ucbBalanced = normalise(raw.map((candidate) => candidate.ucbBalanced));
  const ucbExploit = normalise(raw.map((candidate) => candidate.ucbExploit));
  const mean = normalise(raw.map((candidate) => candidate.mean));
  const localTrust = normalise(raw.map((candidate) => candidate.localTrust));
  const uncertainty = normalise(raw.map((candidate) => candidate.std));
  const novelty = normalise(raw.map((candidate) => candidate.novelty));

  const weights = {
    ei: 0.3,
    ucbExplore: 0.17 * (1 - progress),
    ucbBalanced: 0.22,
    ucbExploit: 0.08 + 0.08 * progress,
    mean: 0.06 + 0.12 * progress,
    localTrust: 0.09 + 0.13 * progress,
    uncertainty: 0.05 * (1 - progress),
    novelty: 0.03 * (1 - progress),
  };

  return raw.map((candidate, index) => ({
    ...candidate,
    portfolioScore:
      weights.ei * ei[index] +
      weights.ucbExplore * ucbExplore[index] +
      weights.ucbBalanced * ucbBalanced[index] +
      weights.ucbExploit * ucbExploit[index] +
      weights.mean * mean[index] +
      weights.localTrust * localTrust[index] +
      weights.uncertainty * uncertainty[index] +
      weights.novelty * novelty[index],
  }));
}

function chooseNextGPSample(observations: Sample[], landscape: Landscape, mode: OptimiserMode, turn: number): Sample {
  const evaluated = evaluateCandidates(observations, mode, turn);
  let bestCandidate: CandidateEvaluation | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of evaluated) {
    if (candidate.portfolioScore > bestScore) {
      bestScore = candidate.portfolioScore;
      bestCandidate = candidate;
    }
  }

  return makeSample(bestCandidate ?? { x: 0.5, y: 0.5 }, landscape);
}

function formatScore(value: number | undefined): string {
  if (value === undefined) return "-";
  return value.toFixed(3);
}

function colourFromValue(value: number, alpha = 1): string {
  const hue = 245 - 185 * clamp01(value);
  const lightness = 18 + 48 * clamp01(value);
  return `hsla(${hue}, 78%, ${lightness}%, ${alpha})`;
}

function labelForMode(_mode: OptimiserMode): string {
  return "Optimiser";
}

function explanationForMode(mode: OptimiserMode): string {
  if (mode === "portfolio") return "Balanced mixes several search strategies to hunt for good regions without getting stuck too early.";
  if (mode === "greedy") return "Picks where the predicted score is highest. Strong when the model is right early on, but weak if it doesn't.";
  return "Picks where uncertainty is highest. It learns the map quickly, but doesn't spend a lot of time in the good regions.";
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function drawUnknownBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#1f2937");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const p = (i / 10) * width;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(width, p);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "600 16px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Hidden objective surface", width / 2, height / 2 - 6);
  ctx.font = "400 12px ui-sans-serif, system-ui";
  ctx.fillText("click to reveal one experiment at a time", width / 2, height / 2 + 16);
}

type HeatmapProps = {
  landscape: Landscape;
  overlayMode: OverlayMode;
  optimiserMode: OptimiserMode;
  gpSamples: Sample[];
  turn: number;
  ended: boolean;
};

function HeatmapCanvas({ landscape, overlayMode, optimiserMode, gpSamples, turn, ended }: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (overlayMode === "unknown" || (overlayMode === "truth" && !ended)) {
      drawUnknownBackground(ctx, width, height);
      return;
    }

    const model = fitGP(gpSamples);
    const imageData = ctx.createImageData(CANVAS_RESOLUTION, CANVAS_RESOLUTION);
    const rawValues: number[] = [];
    const evaluated = overlayMode === "acquisition" ? evaluateCandidates(gpSamples, optimiserMode, turn) : [];

    for (let py = 0; py < CANVAS_RESOLUTION; py += 1) {
      for (let px = 0; px < CANVAS_RESOLUTION; px += 1) {
        const x = px / (CANVAS_RESOLUTION - 1);
        const y = 1 - py / (CANVAS_RESOLUTION - 1);
        const prediction = predictGP(model, { x, y });

        if (overlayMode === "truth") {
          rawValues.push(objective(x, y, landscape));
        } else if (overlayMode === "belief") {
          rawValues.push(prediction.mean);
        } else if (overlayMode === "uncertainty") {
          rawValues.push(prediction.std);
        } else {
          const nearest = evaluated.reduce(
            (best, candidate) => {
              const d = squaredDistance(candidate, { x, y });
              return d < best.d ? { d, score: candidate.portfolioScore } : best;
            },
            { d: Number.POSITIVE_INFINITY, score: 0 },
          );
          rawValues.push(nearest.score);
        }
      }
    }

    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    const span = Math.max(max - min, 1e-9);

    for (let i = 0; i < rawValues.length; i += 1) {
      const normalised = clamp01((rawValues[i] - min) / span);
      const hue = 245 - 185 * normalised;
      const rgb = hslToRgb(hue / 360, 0.72, 0.16 + 0.52 * normalised);
      imageData.data[i * 4] = rgb[0];
      imageData.data[i * 4 + 1] = rgb[1];
      imageData.data[i * 4 + 2] = rgb[2];
      imageData.data[i * 4 + 3] = 255;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_RESOLUTION;
    offscreen.height = CANVAS_RESOLUTION;
    const offscreenCtx = offscreen.getContext("2d");
    if (!offscreenCtx) return;
    offscreenCtx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, width, height);
  }, [landscape, overlayMode, optimiserMode, gpSamples, turn, ended]);

  return <canvas ref={canvasRef} className="bayes-game-canvas" aria-hidden="true" />;
}

type PointLayerProps = {
  samples: Sample[];
  kind: "player" | "gp";
  revealValues?: boolean;
  initialCount?: number;
};

function PointLayer({ samples, kind, revealValues = true, initialCount = STARTING_POINTS.length }: PointLayerProps) {
  return (
    <>
      {samples.map((sample, index) => {
        const isInitial = index < initialCount;
        const shouldReveal = revealValues || kind === "player";
        const displayValue = shouldReveal ? sample.value : 0.52;
        const size = shouldReveal ? (isInitial ? 13 : 16 + sample.value * 12) : 16;

        return (
          <span
            key={`${kind}-${index}-${sample.x}-${sample.y}`}
            className={`bayes-map-point bayes-map-point-${kind}`}
            style={{
              left: `${sample.x * 100}%`,
              top: `${(1 - sample.y) * 100}%`,
              width: size,
              height: size,
              background: kind === "player" ? colourFromValue(displayValue) : "rgba(255,255,255,0.94)",
              borderColor: kind === "player" ? "rgba(255,255,255,0.95)" : colourFromValue(displayValue),
              boxShadow: shouldReveal
                ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 ${8 + 18 * displayValue}px ${colourFromValue(displayValue, 0.65)}`
                : "0 0 0 3px rgba(255,255,255,0.35), 0 10px 18px rgba(0,0,0,0.28)",
            }}
            title={
              shouldReveal
                ? `${kind === "player" ? "Your" : "GP"} sample ${index + 1}: ${formatScore(sample.value)}`
                : `GP sample ${index + 1}: value hidden until the end`
            }
          />
        );
      })}
    </>
  );
}

function ScoreSparkline({ samples, label, hidden = false }: { samples: Sample[]; label: string; hidden?: boolean }) {
  const width = 220;
  const height = 52;
  const values = samples.slice(STARTING_POINTS.length).map((sample) => sample.value);
  const runningBest = values.map((_, index) => Math.max(...values.slice(0, index + 1)));
  const path = runningBest
    .map((value, index) => {
      const x = runningBest.length <= 1 ? 0 : (index / (runningBest.length - 1)) * width;
      const y = height - value * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="bayes-sparkline-card">
      <div className="bayes-sparkline-header">
        <span>{label}</span>
        <span>{hidden ? "hidden" : formatScore(bestSample(samples)?.value)}</span>
      </div>
      {hidden ? (
        <div className="bayes-sparkline-hidden">GP scores reveal after the game</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="bayes-sparkline" aria-hidden="true">
          <line x1="0" x2={width} y1={height - 0.25 * height} y2={height - 0.25 * height} />
          <line x1="0" x2={width} y1={height - 0.5 * height} y2={height - 0.5 * height} />
          <line x1="0" x2={width} y1={height - 0.75 * height} y2={height - 0.75 * height} />
          {path ? <path d={path} /> : null}
        </svg>
      )}
    </div>
  );
}

export default function BayesGame() {
  const [seed, setSeed] = useState(20260509);
  const landscape = useMemo(() => createLandscape(seed), [seed]);
  const initialSamples = useMemo(() => STARTING_POINTS.map((point) => makeSample(point, landscape)), [landscape]);
  const [playerSamples, setPlayerSamples] = useState<Sample[]>(initialSamples);
  const [gpSamples, setGpSamples] = useState<Sample[]>(initialSamples);
  const [turn, setTurn] = useState(0);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("unknown");
  const [optimiserMode, setOptimiserMode] = useState<OptimiserMode>("portfolio");
  const [message, setMessage] = useState("Click the map to run your first experiment.");
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearPendingMove = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    setPlayerSamples(initialSamples);
    setGpSamples(initialSamples);
    setTurn(0);
    setOverlayMode("unknown");
    setMessage("Click the map to run your first experiment.");
    setIsAnimating(false);
    clearPendingMove();
  }, [initialSamples]);

  useEffect(() => () => clearPendingMove(), []);

  const ended = turn >= TURNS_PER_GAME;
  const playerLatest = playerSamples[playerSamples.length - 1];
  const playerBest = bestSample(playerSamples);
  const gpBest = bestSample(gpSamples);
  const winner = !ended
    ? null
    : (playerBest?.value ?? 0) > (gpBest?.value ?? 0)
      ? "player"
      : (gpBest?.value ?? 0) > (playerBest?.value ?? 0)
        ? "gp"
        : "draw";

  function samplePoint(point: XY) {
    if (ended || isAnimating) return;

    const playerSample = makeSample(point, landscape);
    const gpSample = chooseNextGPSample(gpSamples, landscape, optimiserMode, turn);

    setIsAnimating(true);
    setPlayerSamples((previous) => [...previous, playerSample]);
    setMessage(`You found ${formatScore(playerSample.value)}. The optimiser is choosing its experiment...`);

    timeoutRef.current = window.setTimeout(() => {
      setGpSamples((previous) => [...previous, gpSample]);
      setTurn((previous) => {
        const nextTurn = previous + 1;
        if (nextTurn >= TURNS_PER_GAME) {
          setOverlayMode("truth");
          setMessage("Game over. The true landscape and the optimiser's scores are now visible.");
        } else {
          setMessage("The optimiser sampled a point. Its value stays hidden until the reveal.");
        }
        return nextTurn;
      });
      setIsAnimating(false);
      timeoutRef.current = null;
    }, 420);
  }

  function handleMapClick(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    samplePoint({
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01(1 - (event.clientY - rect.top) / rect.height),
    });
  }

  function handleMapKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      samplePoint({ x: 0.5, y: 0.5 });
    }
  }

  function restartCurrentGame() {
    clearPendingMove();
    setPlayerSamples(initialSamples);
    setGpSamples(initialSamples);
    setTurn(0);
    setOverlayMode("unknown");
    setMessage("Click the map to run your first experiment.");
    setIsAnimating(false);
  }

  function startNewMap() {
    clearPendingMove();
    setIsAnimating(false);
    setSeed((previous) => previous + 101);
  }

  const overlayOptions: { value: OverlayMode; label: string; disabled?: boolean }[] = [
    { value: "unknown", label: "Hidden surface" },
    { value: "truth", label: ended ? "True landscape" : "True landscape locked", disabled: !ended },
  ];

  return (
    <div className="bayes-game-shell">
      <div className="bayes-game-grid">
        <div>
          <div className="bayes-map-header">
            <div className="bayes-overlay-buttons">
              {overlayOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setOverlayMode(option.value)}
                  className={overlayMode === option.value ? "is-active" : ""}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span>Round {Math.min(turn + 1, TURNS_PER_GAME)} / {TURNS_PER_GAME}</span>
          </div>

          <button
            type="button"
            aria-label="Experiment map"
            onClick={handleMapClick}
            onKeyDown={handleMapKeyDown}
            className={`bayes-map ${ended || isAnimating ? "is-locked" : ""}`}
          >
            <HeatmapCanvas
              landscape={landscape}
              overlayMode={overlayMode}
              optimiserMode={optimiserMode}
              gpSamples={gpSamples}
              turn={turn}
              ended={ended}
            />
            {ended && overlayMode === "truth" ? (
              <span
                className="bayes-map-optimum"
                style={{
                  left: `${landscape.optimum.x * 100}%`,
                  top: `${(1 - landscape.optimum.y) * 100}%`,
                }}
                title="True optimum"
              />
            ) : null}
            <PointLayer samples={playerSamples} kind="player" revealValues />
            <PointLayer samples={gpSamples.slice(STARTING_POINTS.length)} kind="gp" revealValues={ended} initialCount={0} />
            <span className="bayes-map-message">{message}</span>
          </button>

          <div className="bayes-map-legend">
            <span><i className="bayes-legend-player" /> Your samples</span>
            <span><i className="bayes-legend-gp" /> GP samples</span>
            <span><i className="bayes-legend-optimum" /> True optimum</span>
          </div>
        </div>

        <aside className="bayes-score-panel">
          <section className="bayes-how-to-play" aria-labelledby="bayes-how-to-play-title">
            <h2 id="bayes-how-to-play-title">How to play</h2>
            <ol>
              <li>The goal is to score more than the Optimiser, an evil AI nemesis.</li>
              <li>You get a score by clicking in the grid.</li>
              <li>The lowest score is 0 and the highest is 1.</li>
              <li>You can see your most recent score and your highest score. Green is good and blue is bad.</li>
              <li>Good luck!</li>
            </ol>
          </section>

          <fieldset className="bayes-mode-fieldset" aria-label="Optimiser personality">
            <legend>Optimiser personality</legend>
            <div className="bayes-segmented-control">
              {(["portfolio", "greedy", "curious"] as OptimiserMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOptimiserMode(mode)}
                  disabled={turn > 0 || isAnimating}
                  className={optimiserMode === mode ? "is-active" : ""}
                >
                  {mode === "portfolio" ? "Balanced" : mode === "greedy" ? "Greedy" : "Curious"}
                </button>
              ))}
            </div>
            <p>{explanationForMode(optimiserMode)}</p>
          </fieldset>

          <h2>Scoreboard</h2>

          <div className="bayes-score-grid">
            <div className="bayes-score-card bayes-score-card-player">
              <span>Latest score</span>
              <strong>{formatScore(playerLatest?.value)}</strong>
            </div>

            <div className="bayes-score-card bayes-score-card-player">
              <span>Best score</span>
              <strong>{formatScore(playerBest?.value)}</strong>
            </div>

            <div className="bayes-score-card bayes-score-card-optimiser">
              <span>{labelForMode(optimiserMode)}</span>
              <strong>{ended ? formatScore(gpBest?.value) : "hidden"}</strong>
            </div>

            <div
              className={[
                "bayes-score-card",
                ended && winner === "player" ? "bayes-score-card-player" : "",
                ended && winner === "gp" ? "bayes-score-card-optimiser" : "",
                !ended || winner === "draw" ? "bayes-score-card-neutral" : "",
              ].join(" ")}
            >
              <span>{ended ? "Winner" : "Rounds left"}</span>
              <strong>
                {ended
                  ? winner === "player"
                    ? "You"
                    : winner === "gp"
                      ? "Optimiser"
                      : "Draw"
                  : TURNS_PER_GAME - turn}
              </strong>
            </div>
          </div>
          <p className="bayes-result">
            {ended && winner === "player" ? "You won. Your search found a better experiment than the optimiser." : null}
            {ended && winner === "gp" ? "The optimiser won. It found the better point." : null}
            {ended && winner === "draw" ? "Draw. You and the optimiser ended with the same best score." : null}
            {!ended ? "The optimiser's values are hidden during play, so its samples cannot be used as free scouting information." : null}
          </p>

          <div className="bayes-game-actions">
            <button type="button" onClick={restartCurrentGame}>Restart same map</button>
            <button type="button" onClick={startNewMap}>New hidden map</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
