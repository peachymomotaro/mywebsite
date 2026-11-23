"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  colours, dilemmaPayoff, dictatorPayoff, fixedChoices, money, powerRatings,
  publicGoodsPayoffs, responseFromInput, TOYBOX_PATH, trustPayoff,
  type Choice, type DecisionGame,
} from "@/lib/social-science-toybox/games";
import {
  assignPowerCondition, gameComparison,
  powerComparison, powerConditions, type PowerCondition,
} from "@/lib/social-science-toybox/results";
import { Benchmarks, StudyNotes } from "./study-results";
import styles from "../toybox.module.css";

type PayoffRow = { label: string; amounts: number[] };

function PayoffTable({ title, counterpart, rows }: {
  title: string;
  counterpart: string;
  rows: PayoffRow[];
}) {
  return (
    <table className={styles.payoff}>
      <caption>{title}</caption>
      <thead><tr><th scope="col">Scenario</th><th scope="col">You</th><th scope="col">{counterpart}</th></tr></thead>
      <tbody>
        {rows.map(({ label, amounts }) => (
          <tr key={label}><th scope="row">{label}</th><td>{money(amounts[0])}</td><td>{money(amounts[1])}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Payoffs({ id, response }: { id: DecisionGame["id"]; response: number | null }) {
  if (id === "prisoners-dilemma") {
    const yourChoices = response === null ? colours : colours.filter(({ value }) => value === response);
    return (
      <PayoffTable title="Possible payoffs" counterpart="Other player" rows={
        yourChoices.flatMap((you) => colours.map((other) => ({
          label: response === null ? `${you.label} / ${other.label}` : `They choose ${other.label}`,
          amounts: dilemmaPayoff(you.value, other.value),
        })))
      } />
    );
  }

  if (response === null || id === "power-and-trust") return null;

  switch (id) {
    case "dictator": {
      const [you, other] = dictatorPayoff(response);
      return <p className={styles.payoffNote}>You keep <strong>{money(you)}</strong> and the other player receives <strong>{money(other)}</strong>.</p>;
    }
    case "trust-sender":
      return (
        <PayoffTable title={`The other player receives ${money(3 * response)}`} counterpart="Other player" rows={
          [0, 50, 100].map((percent) => ({
            label: `They return ${percent}%`, amounts: trustPayoff(response, percent),
          }))
        } />
      );
    case "trust-returner":
      return (
        <PayoffTable title="Example payoffs" counterpart="First player" rows={
          [0, 1, 3].map((sent) => ({
            label: `They send ${money(sent)}`, amounts: trustPayoff(sent, response).reverse(),
          }))
        } />
      );
    case "public-goods":
      return (
        <PayoffTable title="Example payoffs" counterpart="Each other player" rows={
          [0, 4].map((amount) => ({
            label: `Each other player puts in ${money(amount)}`,
            amounts: publicGoodsPayoffs([response, amount, amount, amount]),
          }))
        } />
      );
  }
}

function RadioChoices({ choices, selected, onSelect, name }: {
  choices: readonly Choice[];
  selected: string;
  onSelect: (raw: string) => void;
  name: string;
}) {
  return (
    <div className={choices.length > 2 && name === "choice" ? styles.choiceGrid : styles.choiceList}>
      {choices.map(({ value, label }) => (
        <label className={styles.option} key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === String(value)}
            onChange={(event) => onSelect(event.currentTarget.value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

const percentage = (value: number) => `${Number(value.toFixed(1))}%`;

function Results({ experiment, response, condition }: {
  experiment: DecisionGame;
  response: number;
  condition: PowerCondition | null;
}) {
  const { id, measure } = experiment;

  if (id === "power-and-trust") {
    if (!condition) return null;

    const other = powerConditions.find((entry) => entry !== condition);
    return (
      <>
        <p className={styles.resultChoice}>Your response <strong>{offersLabel(response)}</strong></p>
        <p className={styles.resultIntro}>
          You saw the <strong>{condition.label.toLowerCase()}</strong> scenario.
          The bars show the share who offered a free sample in each version.
        </p>
        <div className={styles.conditions}>
          <section className={styles.benchmark} aria-label={condition.label}>
            <h3>{condition.label} · Your scenario</h3>
            <Benchmarks comparison={powerComparison(condition)} scale={100} format={percentage} />
          </section>
          {other && (
            <section className={styles.benchmark} aria-label={other.label}>
              <h3>{other.label}</h3>
              <Benchmarks comparison={powerComparison(other)} scale={100} format={percentage} />
            </section>
          )}
        </div>
      </>
    );
  }

  const isDilemma = id === "prisoners-dilemma";
  const isPercent = isDilemma || id === "trust-returner";
  const scale = isPercent ? 100 : id === "dictator" ? 5 : id === "trust-sender" ? 3 : 4;

  return (
    <>
      {isDilemma && (
        <>
          <p className={styles.resultChoice}>Your response <strong>{response === 1 ? "Orange" : "Purple"}</strong></p>
          <p className={styles.resultIntro}>Researchers call Orange cooperation and Purple defection.</p>
        </>
      )}
      <section className={styles.benchmark} aria-label={measure}>
        <h3>{measure}</h3>
        <Benchmarks comparison={gameComparison(id)} scale={scale}
          format={isPercent ? percentage : (value) => money(Math.round(value * 100) / 100)}
          response={isDilemma ? undefined : response} />
      </section>
    </>
  );
}

function offersLabel(response: number): string {
  return response === 1 ? "Offer a free sample" : "Save the time";
}

function Methods({ experiment }: { experiment: DecisionGame }) {
  const { id, original } = experiment;
  const power = id === "power-and-trust";
  const detail = power
    ? "Each simulation saw the same scenario as the person it represented."
    : id === "public-goods"
      ? "The analysis excluded two pairs because the human answers were outside the valid range."
      : undefined;

  return (
    <StudyNotes original={original} comparisonDetail={detail}>
      {power ? (
        <p>
          Each play randomly gives you one of the two scenarios with equal odds. The study also assigned
          one scenario per participant. Both the power rating and the free-sample choice are included here.
          The comparison uses the choice, the study’s main outcome. Schilke et al.’s earlier
          experiment also varied the client’s bargaining power. Park’s version varies the typist’s power.
        </p>
      ) : (
        <p>
          The original games involved real participants and a potential cash bonus. Here, the dollars
          are hypothetical. No one is matched or paid.
          {id === "dictator" && " The instrument gives a dollar range without a fixed increment. This version accepts cents."}
          {id !== "dictator" && id !== "prisoners-dilemma" && " The study gave payoff examples before the choice. Here they appear with the results."}
        </p>
      )}
    </StudyNotes>
  );
}

export function ExperimentGame({ experiment }: { experiment: DecisionGame }) {
  const { id, title, intro, question } = experiment;
  const [raw, setRaw] = useState("");
  const [response, setResponse] = useState<number | null>(null);
  const [condition, setCondition] = useState<PowerCondition | null>(null);
  const [rating, setRating] = useState("");
  const [powerRated, setPowerRated] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const isPower = id === "power-and-trust";
  const choices = fixedChoices[id];
  const parsed = responseFromInput(id, raw);

  useEffect(() => {
    if (moveFocus.current) {
      heading.current?.focus();
      moveFocus.current = false;
    }
  }, [condition, powerRated, response]);

  function reveal() {
    if (parsed === null) return;
    moveFocus.current = true;
    setResponse(parsed);
  }

  function reset() {
    moveFocus.current = true;
    setRaw("");
    setResponse(null);
    setRating("");
    setPowerRated(false);
    setCondition(null);
  }

  return (
    <>
      <header className={styles.experimentHeader}>
        <p className={styles.kicker}>{experiment.category}</p>
        <h1>{title}</h1>
      </header>
      <noscript><p>Enable JavaScript to make a choice and see the study results.</p></noscript>
      {response !== null ? (
        <div className={styles.play}>
          <h2 ref={heading} tabIndex={-1}>How you compare</h2>
          <Results experiment={experiment} response={response} condition={condition} />
          <Payoffs id={id} response={response} />
          <div className={styles.resultActions}>
            <Link className={styles.primary} href={TOYBOX_PATH}>Choose another experiment</Link>
            <button type="button" className={styles.secondary} onClick={reset}>Play again</button>
          </div>
        </div>
      ) : (
        <div className={styles.play}>
          <h2 className={styles.scenarioTitle} ref={!isPower || !condition ? heading : undefined} tabIndex={-1}>The scenario</h2>
          <p>{intro}</p>
          {!isPower && <p className={styles.payoffNote}>The payoffs are hypothetical.</p>}
          {condition && <p>{condition.work}</p>}
          <Payoffs id={id} response={null} />
          {isPower && condition === null && (
            <button type="button" className={styles.primary} onClick={() => {
              moveFocus.current = true;
              setCondition(assignPowerCondition());
            }}>Begin</button>
          )}
          {isPower && condition && !powerRated && (
            <>
              <h3 ref={heading} tabIndex={-1} id="power-rating">How much power do you feel in this situation?</h3>
              <fieldset aria-labelledby="power-rating">
                <RadioChoices name="power-rating" selected={rating} onSelect={setRating}
                  choices={powerRatings.map((label, index) => ({ value: index + 1, label }))} />
              </fieldset>
              <button type="button" className={styles.primary} disabled={!rating} onClick={() => {
                moveFocus.current = true;
                setPowerRated(true);
              }}>Continue</button>
            </>
          )}
          {(!isPower || powerRated) && (
            <>
              <h3 ref={isPower ? heading : undefined} tabIndex={isPower ? -1 : undefined} id="choice-prompt">{question}</h3>
              {choices ? (
                <fieldset aria-labelledby="choice-prompt">
                  <RadioChoices name="choice" choices={choices} selected={raw} onSelect={setRaw} />
                </fieldset>
              ) : (
                <div className={styles.amountEntry}>
                  <label htmlFor="amount">Amount in dollars</label>
                  <input id="amount" type="text" inputMode="decimal" autoComplete="off" value={raw}
                    aria-describedby="amount-hint" aria-invalid={raw !== "" && parsed === null}
                    onChange={(event) => setRaw(event.currentTarget.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") reveal(); }} />
                  <p id="amount-hint">Enter $0 to {id === "dictator" ? "$5" : "$4"} using up to two decimal places.</p>
                </div>
              )}
              <button type="button" className={styles.primary} disabled={parsed === null} onClick={reveal}>Compare responses</button>
            </>
          )}
        </div>
      )}
      <Methods experiment={experiment} />
    </>
  );
}
