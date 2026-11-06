"use client";

import { useMemo, useState } from "react";
import { population, publicOpinion, thresholdHistory } from "@/lib/preference-cascades/model";
import { percent, SimulationControls, usePlayback } from "./simulation-controls";

export default function ThresholdLesson() {
  const [threshold, setThreshold] = useState(20);
  const [spark, setSpark] = useState(0);
  const people = useMemo(() => population(threshold), [threshold]);
  const history = useMemo(() => thresholdHistory(people, spark), [people, spark]);
  const baseline = useMemo(() => thresholdHistory(population(20), spark), [spark]);
  const playback = usePlayback(history);
  const next = publicOpinion(people, playback.current);
  const changedFinal = history[history.length - 1];
  const baselineFinal = baseline[baseline.length - 1];

  function chooseThreshold(value: number) { setThreshold(value); playback.reset(); }

  return (
    <section className="pc-lesson pc-extension" aria-labelledby="pc-threshold-heading">
      <p className="small">A separate exercise in the wider theory</p>
      <h2 id="pc-threshold-heading">When one person unlocks a cascade</h2>
      <p>The original diagram has one resting point. Other threshold distributions can behave very differently. Here are ten people who all privately favour change. Each will speak publicly only when expected dissent meets their own threshold.</p>
      <p>A threshold of 20% means “I’ll speak if I expect at least two in ten people to speak”. Each person is 10% of this small population; everyone updates at the same time.</p>
      <div className="pc-threshold-controls">
        <div>
          <div className="pc-label"><label htmlFor="pc-threshold">Person 2’s threshold</label><output htmlFor="pc-threshold" aria-label="Selected threshold">{percent(threshold)}</output></div>
          <input id="pc-threshold" type="range" min="0" max="100" step="10" value={threshold} onChange={(event) => chooseThreshold(Number(event.target.value))} />
          <div className="pc-range-ends"><span>Speaks regardless</span><span>Needs everyone</span></div>
        </div>
        <div>
          <div className="pc-label"><label htmlFor="pc-spark">Initial public spark</label><output htmlFor="pc-spark" aria-label="Selected public spark">{percent(spark)}</output></div>
          <input id="pc-spark" type="range" min="0" max="100" step="10" value={spark} onChange={(event) => { setSpark(Number(event.target.value)); playback.reset(); }} />
          <div className="pc-range-ends"><span>0%</span><span>100%</span></div>
        </div>
      </div>
      <p className="pc-help">The spark is a starting expectation, not a group forced to keep speaking. People can fall silent again.</p>
      <div className="pc-presets">
        <button className="button button-small" type="button" onClick={() => chooseThreshold(10)}>Lower person 2 to 10%</button>
        <button className="button button-small" type="button" onClick={() => chooseThreshold(20)}>Restore person 2 to 20%</button>
      </div>
      <div className="pc-population-heading"><h3>Who would speak this round?</h3><span>Solid = speaking; outline = silent</span></div>
      <ol className="pc-population" aria-label="Individual public decisions for the next round">
        {people.map((value, i) => {
          const speaking = value <= playback.current;
          return (
            <li key={i} className={speaking ? "pc-person pc-speaking" : "pc-person"}>
              <span className="pc-person-name">Person {i + 1}{i === 1 ? " (editable)" : ""}</span>
              <span className="pc-person-mark" aria-hidden="true">{i + 1}</span>
              <span>Threshold {percent(value)}</span>
              <strong>{speaking ? "Speaking" : "Silent"}</strong>
            </li>
          );
        })}
      </ol>
      <div className="pc-extension-playback">
        <SimulationControls playback={playback} />
        <p className="pc-round-readout">Expected now <strong data-testid="threshold-current">{percent(playback.current)}</strong> <span>Would speak out <strong>{percent(next)}</strong> ({next / 10} of 10)</span></p>
      </div>
      <p className="pc-status" role="status">Round {playback.round}. {playback.atEnd ? "No further change: expectation matches public expression." : `Next round’s expectation will be ${percent(next)}.`}</p>
      <div className="pc-comparison" aria-label="Computed eventual public dissent">
        <div><span>Original population</span><strong data-testid="baseline-outcome">{percent(baselineFinal)}</strong><span>eventually speak out</span></div>
        <div><span>Person 2’s threshold at {percent(threshold)}</span><strong data-testid="changed-outcome">{percent(changedFinal)}</strong><span>eventually speak out</span></div>
      </div>
      <p className="pc-help">Both cases use the same ten people, private preferences, starting expectation of {percent(spark)}, and update rule. {threshold === 20 ? "Person 2 still has the original 20% threshold; both cases are identical." : `Only person 2’s threshold changes from 20% to ${percent(threshold)}.`}</p>
      <p className="pc-interpretation">{threshold === 10 && spark === 0
        ? "Person 1 speaks regardless. At 10% expected dissent, person 2 now joins. That takes public dissent to 20%, enough for person 3, and so on. One changed threshold closes a gap in the chain."
        : changedFinal === baselineFinal
          ? "These conditions lead to the same eventual outcome in both cases. A small threshold change does not automatically produce a cascade. Try lowering person 2 to 10% with the spark at 0%."
          : `Changing this one threshold changes eventual public expression from ${percent(baselineFinal)} to ${percent(changedFinal)}. Step through the decisions to see where the chain opens or stalls.`}
      </p>
      <p><strong>None of their private views changed.</strong> What changed was the willingness to express those views publicly. In preference falsification, a person’s public expression differs from their private preference.</p>
    </section>
  );
}
