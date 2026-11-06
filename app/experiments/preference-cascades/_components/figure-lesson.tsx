"use client";

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { FIGURE_POINTS, figureHistory, figureOpinion } from "@/lib/preference-cascades/model";
import { percent, SimulationControls, usePlayback } from "./simulation-controls";

const LEFT = 60;
const TOP = 16;
const SIZE = 360;
const X = (value: number) => LEFT + value / 100 * SIZE;
const Y = (value: number) => TOP + SIZE - value / 100 * SIZE;
const valleyY = (value: number) => 548 - 48 * ((value - 40) / (value < 40 ? 40 : 60)) ** 2;
const curvePath = FIGURE_POINTS.map(([x, y], i) => `${i ? "L" : "M"}${X(x)},${Y(y)}`).join(" ");
const valleyPath = Array.from({ length: 101 }, (_, value) => `${value ? "L" : "M"}${X(value)},${valleyY(value)}`).join(" ");

export default function FigureLesson() {
  const [start, setStart] = useState(20);
  const history = useMemo(() => figureHistory(start), [start]);
  const playback = usePlayback(history);
  const { current, round, atEnd } = playback;
  const next = figureOpinion(current);
  const direction = current < 40 ? "rises" : "falls";
  const trajectory = history.slice(0, round + 1).flatMap((x, i, values) => {
    if (i === values.length - 1) return [];
    const y = values[i + 1];
    return [`${X(x)},${Y(x)} ${X(x)},${Y(y)} ${X(y)},${Y(y)}`];
  }).join(" ");

  function choose(value: number) {
    setStart(Math.max(0, Math.min(100, Math.round(value))));
    playback.reset();
  }
  function chooseFromPointer(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    choose((event.clientX - bounds.left) / bounds.width * 100);
  }
  function chooseFromKey(event: KeyboardEvent<SVGRectElement>) {
    const changes: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (event.key === "Home" || event.key === "End" || event.key in changes) {
      event.preventDefault();
      choose(event.key === "Home" ? 0 : event.key === "End" ? 100 : start + changes[event.key]);
    }
  }

  return (
    <section className="pc-lesson" aria-labelledby="pc-figure-heading">
      <h2 id="pc-figure-heading">When expectations settle</h2>
      <p>Suppose people expect 20% of the population to speak out. In this example, 35% would actually do so. Seeing that, people revise their expectation upwards. Repeating this process brings them towards 40%.</p>
      <p className="pc-invitation">Choose a starting expectation on the graph or slider, then press Play. Try starting above 40%, too.</p>
      <div className="pc-figure-layout">
        <figure className="pc-figure">
          <svg className="pc-graph" viewBox="0 0 448 590" role="group" aria-label="Figure A: propagation curve, and Figure B: a ball settling in a valley">
            <title>One stable equilibrium at 40%</title>
            <desc>The solid curve gives actual public dissent for each expectation. Its only crossing with the dashed identity line is at 40%. The ball below shows the same expectation approaching the bottom of a valley.</desc>
            {[0, 20, 40, 60, 80, 100].map((value) => (
              <g key={value}>
                <line x1={X(0)} x2={X(100)} y1={Y(value)} y2={Y(value)} className="pc-grid" />
                <text x={LEFT - 12} y={Y(value) + 5} textAnchor="end" className="pc-tick">{value}</text>
                <text x={X(value)} y={Y(0) + 24} textAnchor="middle" className="pc-tick">{value}</text>
              </g>
            ))}
            <path d={`M${X(0)},${Y(0)} L${X(100)},${Y(100)}`} className="pc-identity" />
            <path d={curvePath} className="pc-curve" />
            <line x1={X(40)} x2={X(40)} y1={Y(40)} y2="558" className="pc-equilibrium-guide" />
            <circle cx={X(40)} cy={Y(40)} r="5" className="pc-equilibrium" />
            <text x={X(40) + 12} y={Y(40) - 14} className="pc-note">40% equilibrium</text>
            {trajectory && <polyline points={trajectory} className="pc-trajectory" />}
            <path d={`M${X(current)},${Y(0)} V${Y(next)} H${X(0)}`} className="pc-current-guide" />
            <circle cx={X(current)} cy={Y(next)} r="7" className="pc-current" />
            <text x={LEFT + SIZE / 2} y="432" textAnchor="middle" className="pc-axis">Expected public dissent (%)</text>
            <text x="16" y={TOP + SIZE / 2} transform={`rotate(-90 16 ${TOP + SIZE / 2})`} textAnchor="middle" className="pc-axis">Actual public dissent (%)</text>
            <text x={LEFT} y="475" className="pc-note">The same expectation, in a valley</text>
            <path d={valleyPath} className="pc-valley" />
            <circle cx={X(current)} cy={valleyY(current) - 8} r="8" className="pc-ball" />
            {/* avoid-ai-design-ignore: L4 -- scale labels for the valley analogy */}
            <text x={X(0)} y="578" className="pc-tick">0%</text>
            <text x={X(40)} y="578" textAnchor="middle" className="pc-tick">40%</text>
            <text x={X(100)} y="578" textAnchor="end" className="pc-tick">100%</text>
            <rect x={LEFT} y={TOP} width={SIZE} height={SIZE} fill="transparent" className="pc-graph-input"
              role="slider" tabIndex={0} aria-label="Choose expectation on the graph" aria-valuemin={0} aria-valuemax={100} aria-valuenow={start} aria-valuetext={percent(start)}
              onKeyDown={chooseFromKey}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); chooseFromPointer(event); }}
              onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) chooseFromPointer(event); }}
              onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />
          </svg>
          <figcaption>
            <div className="pc-legend"><span><i className="pc-key-curve" /> Propagation curve</span><span><i className="pc-key-identity" /> Expectation = reality</span><span><i className="pc-key-trace" /> Revisions so far</span></div>
            <p>A teaching approximation of Figure 4.3. The valley is an analogy for the direction of adjustment, not a physical simulation.</p>
          </figcaption>
        </figure>
        <div className="pc-figure-controls">
          <div className="pc-label"><label htmlFor="pc-start">Initial expectation</label><output htmlFor="pc-start" aria-label="Selected initial expectation">{percent(start)}</output></div>
          <input id="pc-start" type="range" min="0" max="100" step="1" value={start} onChange={(event) => choose(Number(event.target.value))} />
          <div className="pc-range-ends"><span>0%</span><span>100%</span></div>
          <p className="pc-help">The fraction people expect to speak out before the first round.</p>
          <SimulationControls playback={playback} />
          <dl className="pc-readout">
            <div><dt>Expected now</dt><dd data-testid="figure-current">{percent(current)}</dd></div>
            <div><dt>Would speak out</dt><dd>{percent(next)}</dd></div>
          </dl>
          <p className="pc-status" role="status">Round {round}. {atEnd ? "At equilibrium (within 0.01 percentage points of 40%)." : `Next, expectation ${direction} to ${percent(next)}.`}</p>
          <div className="pc-interpretation">
            <h3>Why 40%?</h3>
            <p>Below 40%, the curve is above the diagonal: more people speak out than expected. Above 40%, it is below: fewer do. Only at 40% does expectation reproduce itself.</p>
            <p>Like the ball at the bottom of the valley, an expectation settles here from either side.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
