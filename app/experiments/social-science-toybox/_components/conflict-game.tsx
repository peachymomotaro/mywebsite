"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  agreementOptions, assignConflictCondition, conflictConditions, conflictExperiment,
  conflictScore, conflictStatements, type ConflictCondition,
} from "@/lib/social-science-toybox/conflict";
import { TOYBOX_PATH } from "@/lib/social-science-toybox/games";
import { Benchmarks, StudyNotes } from "./study-results";
import styles from "../toybox.module.css";

const formatRating = (value: number) => `${value.toFixed(2)} / 7`;

function ConflictResults({ assigned, score }: { assigned: ConflictCondition; score: number }) {
  return (
    <>
      <p className={styles.resultIntro}>
        The score averages the three ratings. A 1 means strong disagreement
        with all three statements, and a 7 means strong agreement.
      </p>
      <div className={styles.conditions}>
        {[assigned, ...conflictConditions.filter(({ id }) => id !== assigned.id)].map((condition) => {
          const isAssigned = condition.id === assigned.id;
          return (
            <section className={styles.benchmark} key={condition.id} aria-label={condition.label}>
              <h3>{condition.label}{isAssigned && " · Your prompt"}</h3>
              <Benchmarks comparison={condition.comparison} min={1} scale={7} format={formatRating}
                response={isAssigned ? score : undefined} responseDetail="Average of your three ratings" />
            </section>
          );
        })}
      </div>
      <p className={styles.resultIntro}>
        People who recalled stepping in rated it more favourably than those who recalled staying out.
        The AI ratings showed a larger gap between the two groups.
      </p>
    </>
  );
}

type Stage = "start" | "recall" | "ratings" | "results";

export function ConflictGame() {
  const [stage, setStage] = useState<Stage>("start");
  const [condition, setCondition] = useState<ConflictCondition>();
  const [hasNote, setHasNote] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const score = conflictScore(ratings);

  function goTo(next: Stage) {
    moveFocus.current = true;
    setStage(next);
  }

  useEffect(() => {
    if (moveFocus.current) {
      heading.current?.focus();
      moveFocus.current = false;
    }
  }, [stage]);

  return (
    <>
      <header className={styles.experimentHeader}>
        <p className={styles.kicker}>{conflictExperiment.category}</p>
        <h1>{conflictExperiment.title}</h1>
      </header>
      <noscript><p>Enable JavaScript to try the experiment and see the study results.</p></noscript>
      <div className={styles.play}>
        {stage === "start" && (
          <>
            <h2 ref={heading} tabIndex={-1}>A conflict between friends</h2>
            <p>You’ll get one of two prompts about a conflict you witnessed, then rate three statements about stepping in.</p>
            <button type="button" className={styles.primary} onClick={() => {
              setCondition(assignConflictCondition());
              goTo("recall");
            }}>Begin</button>
          </>
        )}
        {stage === "recall" && condition && (
          <>
            <h2 ref={heading} tabIndex={-1}>Recall a conflict</h2>
            <p>{condition.recall}</p>
            <div className={styles.responseField}>
              <label htmlFor="conflict-note">Describe what happened in a short paragraph.</label>
              <textarea id="conflict-note" rows={4} autoComplete="off" spellCheck={false} aria-describedby="conflict-note-hint"
                onChange={(event) => setHasNote(event.currentTarget.value.trim().length > 0)} />
              <p id="conflict-note-hint" className={styles.fieldHint}>
                Leave out names and identifying details. The note stays on this page and clears when you continue.
              </p>
            </div>
            <div className={styles.resultActions}>
              <button type="button" className={styles.primary} disabled={!hasNote} onClick={() => {
                setHasNote(false);
                goTo("ratings");
              }}>Continue</button>
              <Link className={styles.secondary} href={TOYBOX_PATH}>I can’t recall an example</Link>
            </div>
          </>
        )}
        {stage === "ratings" && (
          <>
            <h2 ref={heading} tabIndex={-1}>Rate three statements</h2>
            <p>With that conflict in mind, how much do you agree or disagree with each statement?</p>
            {conflictStatements.map(({ id, label }, index) => (
              <div className={styles.responseField} key={id}>
                <label htmlFor={id}>{label}</label>
                <select id={id} value={ratings[index] ?? 0} onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  setRatings((previous) => conflictStatements.map((_, position) =>
                    position === index ? value : previous[position] ?? 0));
                }}>
                  <option value={0} disabled>Choose a rating</option>
                  {agreementOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            ))}
            <button type="button" className={styles.primary} disabled={score === null}
              onClick={() => goTo("results")}>Compare responses</button>
          </>
        )}
        {stage === "results" && condition && score !== null && (
          <>
            <h2 ref={heading} tabIndex={-1}>How you compare</h2>
            <ConflictResults assigned={condition} score={score} />
            <div className={styles.resultActions}>
              <Link className={styles.primary} href={TOYBOX_PATH}>Choose another experiment</Link>
              <button type="button" className={styles.secondary} onClick={() => {
                setCondition(undefined);
                setRatings([]);
                goTo("start");
              }}>Play again</button>
            </div>
          </>
        )}
      </div>
      <StudyNotes original={conflictExperiment.original}
        comparisonDetail="For this experiment, each simulation received the recall prompt assigned to the person it represented. The archive reports the three-item average per condition.">
        <p>
          Each play assigns one recall prompt with equal odds. You can leave if you can’t remember a
          matching conflict. The site clears your written account before the ratings and shows the benchmark
          for both groups afterward. Park’s comparison uses the same three statements in both groups.
        </p>
      </StudyNotes>
    </>
  );
}
