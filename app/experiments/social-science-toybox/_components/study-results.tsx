import type { ReactNode } from "react";
import { PARK_AGGREGATES, PARK_PAPER, type Benchmark, type Comparison } from "@/lib/social-science-toybox/results";
import styles from "../toybox.module.css";

function BenchmarkRow({ label, benchmark, min, scale, format, detail, series }: {
  label: string;
  benchmark: Benchmark | null;
  min: number;
  scale: number;
  format: (value: number) => string;
  detail: string;
  series: "you" | "human" | "ai";
}) {
  return (
    <div className={styles.benchmarkRow}>
      <div className={styles.benchmarkText}>
        <strong>{label}</strong>
        <span>{benchmark ? format(benchmark.value) : "Unavailable"}</span>
      </div>
      <p>
        {benchmark
          ? `${detail}${series === "you" ? "" : ` · n = ${benchmark.n.toLocaleString("en-US")}`}`
          : "The public release does not give a comparable result for this question and condition."}
      </p>
      {benchmark && (
        <div className={styles.track} aria-hidden="true">
          <div className={styles[series]} style={{ width: `${100 * (benchmark.value - min) / (scale - min)}%` }} />
        </div>
      )}
    </div>
  );
}

export function Benchmarks({ comparison, min = 0, scale, format, response, responseDetail = "Your choice" }: {
  comparison: Comparison;
  min?: number;
  scale: number;
  format: (value: number) => string;
  response?: number;
  responseDetail?: string;
}) {
  return (
    <>
      {response !== undefined && (
        <BenchmarkRow label="Your response" benchmark={{ value: response, n: 1 }} min={min} scale={scale}
          format={format} detail={responseDetail} series="you" />
      )}
      <BenchmarkRow label="Human responses" benchmark={comparison.human} min={min} scale={scale}
        format={format} detail="Park et al. participants, wave 1" series="human" />
      <BenchmarkRow label="AI responses" benchmark={comparison.ai} min={min} scale={scale}
        format={format} detail="Claude Opus 5.5, survey and interview" series="ai" />
    </>
  );
}

export function StudyNotes({ original, comparisonDetail, children }: {
  original: { name: string; url: string };
  comparisonDetail?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.notes}>
      <details>
        <summary>Study and sources</summary>
        <p>
          The human results come from the first wave of Park et al.’s study of U.S. adults.
          The AI results come from the study’s Claude Opus 5.5 simulations, which used each participant’s
          survey answers and interview to predict their choices. Target answers were held out.
          {comparisonDetail && ` ${comparisonDetail}`}
        </p>
        <ul>
          <li><a href={PARK_PAPER}>Park et al. (November 2026), paper and supplement</a></li>
          <li><a href={PARK_AGGREGATES}>Instruments and aggregate results on OSF</a></li>
          <li><a href={original.url}>{original.name}, earlier research</a></li>
        </ul>
      </details>
      <details>
        <summary>How this differs from the original experiment</summary>
        <p>
          Park et al. recruited a U.S. adult sample for a larger study. Anyone can play this
          standalone version and replay it. The instructions are paraphrased and the controls replace the study survey.
        </p>
        {children}
      </details>
    </div>
  );
}
