"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./preference-cascades.css";

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const propagate = (expectation: number, shift: number) =>
  clamp(30 + 0.25 * expectation + 0.0003125 * expectation * (expectation - 20) * (expectation - 40) + shift);
const format = (n: number) => n.toFixed(1).replace(/\.0$/, "");

const WIDTH = 640;
const HEIGHT = 480;
const LEFT = 62;
const TOP = 26;
const SIZE = 370;
const pointX = (x: number) => LEFT + (x / 100) * SIZE;
const pointY = (y: number) => TOP + SIZE - (y / 100) * SIZE;

function pathFor(shift: number) {
  return Array.from({ length: 201 }, (_, i) => {
    const x = i / 2;
    return `${i === 0 ? "M" : "L"}${pointX(x).toFixed(2)},${pointY(propagate(x, shift)).toFixed(2)}`;
  }).join(" ");
}

function trace(start: number, shift: number, n: number) {
  const values = [start];
  for (let i = 0; i < n; i++) {
    const next = propagate(values[values.length - 1], shift);
    values.push(next);
    if (Math.abs(next - values[values.length - 2]) < 0.01) break;
  }
  return values;
}

export default function PreferenceCascades() {
  const [start, setStart] = useState(20);
  const [shift, setShift] = useState(0);
  const [steps, setSteps] = useState(0);
  const [playing, setPlaying] = useState(false);

  const history = useMemo(() => trace(start, shift, steps), [start, shift, steps]);
  const current = history[history.length - 1];
  const next = propagate(current, shift);
  const settled = Math.abs(next - current) < 0.05 || steps >= 80;
  const final = useMemo(() => trace(start, shift, 80).at(-1) ?? start, [start, shift]);
  const baselineFinal = useMemo(() => trace(start, 0, 80).at(-1) ?? start, [start]);
  const path = useMemo(() => pathFor(shift), [shift]);
  const baselinePath = useMemo(() => pathFor(0), []);
  const changeModel = useCallback((nextShift: number) => {
    setShift(nextShift);
    setSteps(0);
    setPlaying(false);
  }, []);
  const changeStart = useCallback((nextStart: number) => {
    setStart(nextStart);
    setSteps(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (settled) return;
    const timer = window.setTimeout(() => setSteps((n) => Math.min(n + 1, 80)), 580);
    return () => window.clearTimeout(timer);
  }, [playing, steps, settled]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (settled && playing) setPlaying(false); }, [settled, playing]);

  const cobweb: string[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    const x = history[i];
    const y = history[i + 1];
    cobweb.push(`${pointX(x)},${pointY(x)} ${pointX(x)},${pointY(y)} ${pointX(y)},${pointY(y)}`);
  }

  return (
    <main className="pc-page">
      <header className="pc-header">
        <a href="/" className="pc-wordmark" aria-label="Peter Curry home"><span className="pc-symbol">●</span> Peter Curry <span className="pc-slash">/</span> Experiments</a>
        <span className="pc-private">Unlisted experiment</span>
      </header>

      <div className="pc-content">
        <div className="pc-eyebrow">AN INTERACTIVE THOUGHT EXPERIMENT <span>01 — COLLECTIVE BEHAVIOUR</span></div>
        <h1>How a crowd <em>changes its mind.</em></h1>
        <p className="pc-intro">A small difference in what people are willing to say publicly can produce a very different society. Explore a simplified model of <strong>Timur Kuran&apos;s preference cascades</strong>.</p>

        <div className="pc-workspace">
          <section className="pc-chart-panel" aria-label="Public opinion propagation graph">
            <div className="pc-panel-head"><span>01 / PROPAGATION CURVE</span><span className="pc-legend"><i className="pc-line-current" /> Current distribution <i className="pc-line-reference" /> Original</span></div>
            <div className="pc-svg-wrap">
              <svg className="pc-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Graph of expected and actual public opinion. Current expectation ${format(current)} percent. After the next adjustment, ${format(next)} percent will speak out.`}>
                {[0, 20, 40, 60, 80, 100].map((v) => (
                  <g key={v}>
                    <line x1={pointX(0)} x2={pointX(100)} y1={pointY(v)} y2={pointY(v)} className="pc-gridline" />
                    <line x1={pointX(v)} x2={pointX(v)} y1={pointY(0)} y2={pointY(100)} className="pc-gridline" />
                    <text x={LEFT - 13} y={pointY(v) + 4} textAnchor="end" className="pc-tick">{v}</text>
                    <text x={pointX(v)} y={pointY(0) + 24} textAnchor="middle" className="pc-tick">{v}</text>
                  </g>
                ))}
                <path d={`M${pointX(0)},${pointY(0)} L${pointX(100)},${pointY(100)}`} className="pc-diagonal" />
                {shift !== 0 && <path d={baselinePath} className="pc-reference" />}
                <path d={path} className="pc-propagation" />
                {cobweb.map((segment, i) => <polyline key={i} points={segment} className="pc-cobweb" />)}
                <line x1={pointX(current)} y1={pointY(0)} x2={pointX(current)} y2={pointY(current)} className="pc-guide" />
                <line x1={pointX(0)} y1={pointY(next)} x2={pointX(current)} y2={pointY(next)} className="pc-guide" />
                <circle cx={pointX(current)} cy={pointY(next)} r="8" className="pc-dot-ring" />
                <circle cx={pointX(current)} cy={pointY(next)} r="3.5" className="pc-dot" />
                <text x={LEFT + SIZE / 2} y={HEIGHT - 34} textAnchor="middle" className="pc-axis">Expected public dissent (%)</text>
                <text x="17" y={TOP + SIZE / 2} transform={`rotate(-90 17 ${TOP + SIZE / 2})`} textAnchor="middle" className="pc-axis">People willing to dissent (%)</text>
              </svg>
            </div>
            <div className="pc-chart-caption"><span>Thin diagonal: expectation matches reality</span><span>Based on Kuran&apos;s propagation-curve diagram</span></div>
          </section>

          <aside className="pc-controls">
            <div className="pc-panel-head">02 / CHANGE THE CONDITIONS</div>
            <div className="pc-controls-body">
              <div className="pc-control">
                <div className="pc-control-heading"><label htmlFor="pc-start">Initial public expectation</label><strong>{format(start)}%</strong></div>
                <input id="pc-start" type="range" min="0" max="100" step="1" value={start} onChange={(e) => changeStart(Number(e.target.value))} />
                <div className="pc-range-labels"><span>Nobody speaks out</span><span>Everyone speaks out</span></div>
                <p>What proportion does everyone expect to dissent at the outset?</p>
              </div>
              <div className="pc-control">
                <div className="pc-control-heading"><label htmlFor="pc-shift">Shift in private thresholds</label><strong>{shift > 0 ? "+" : ""}{format(shift)} pts</strong></div>
                <input id="pc-shift" type="range" min="-5" max="5" step="0.5" value={shift} onChange={(e) => changeModel(Number(e.target.value))} />
                <div className="pc-range-labels"><span>More hesitant</span><span>More willing</span></div>
                <p>A small shift in how many people would speak up at any given expectation.</p>
              </div>
              <div className="pc-presets">
                <button type="button" className={shift === 0 ? "pc-preset active" : "pc-preset"} onClick={() => changeModel(0)}>Original curve</button>
                <button type="button" className={shift === 3 ? "pc-preset active" : "pc-preset"} onClick={() => changeModel(3)}>+3 point shift</button>
              </div>
              <div className="pc-simulation">
                <div className="pc-simulation-stats">
                  <div><span>Expected now</span><strong>{format(current)}%</strong></div>
                  <div><span>Would speak out</span><strong>{format(next)}%</strong></div>
                </div>
                <div className="pc-actions">
                  <button type="button" className="pc-primary" onClick={() => { if (settled) { setSteps(0); setPlaying(true); } else setPlaying((p) => !p); }}>{playing ? "Pause" : settled ? "Replay" : "Play cascade"}</button>
                  <button type="button" className="pc-secondary" onClick={() => { setPlaying(false); setSteps((n) => Math.min(n + 1, 80)); }} disabled={settled}>Step →</button>
                  <button type="button" className="pc-reset" onClick={() => { setPlaying(false); setSteps(0); }} aria-label="Reset the simulation">↺</button>
                </div>
                <div className="pc-step-info" aria-live="polite">Iteration {steps} {settled ? "· Equilibrium reached" : "· Expectation adjusts towards observed dissent"}</div>
              </div>
            </div>
          </aside>
        </div>

        <section className="pc-takeaway" aria-label="Predicted result">
          <div className="pc-takeaway-label">03 / THE CONSEQUENCE</div>
          <div className="pc-results">
            <div className="pc-result"><span>Original distribution</span><strong>{format(baselineFinal)}<small>%</small></strong><span>eventual public dissent</span></div>
            <div className="pc-arrow" aria-hidden="true">→</div>
            <div className="pc-result pc-result-highlight"><span>With a {shift > 0 ? "+" : ""}{format(shift)} point shift</span><strong>{format(final)}<small>%</small></strong><span>eventual public dissent</span></div>
            <div className="pc-explanation">Each round, people revise their expectation to match how many would actually speak out. Near a tipping point, even a tiny shift in the distribution of personal thresholds can eliminate a stable equilibrium and send public opinion towards a completely different outcome. <strong>Try “+3 point shift” then press Play.</strong></div>
          </div>
        </section>
        <footer className="pc-footer">
          <p><strong>About the model.</strong> This is an illustrative, deterministic interpretation of the propagation curve in Timur Kuran&apos;s <em>Private Truths, Public Lies</em> (1995), not a calibrated forecast or a reproduction of individual survey data. The original curve is approximated by f(x) = 30 + 0.25x + 0.0003125x(x − 20)(x − 40), bounded between 0 and 100; the shift control adds percentage points to that curve. An equilibrium is a crossing of the curve with the 45° line.</p>
          <a href="https://www.atvbt.com/widget-help-request/" target="_blank" rel="noopener noreferrer">Inspired by the request at Atoms vs Bits ↗</a>
        </footer>
      </div>
    </main>
  );
}
