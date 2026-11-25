import { CAMPS } from "@/lib/summit/mountain";
import styles from "@/styles/summit.module.css";

/**
 * The view from the top, composed like Friedrich's "Wanderer above the Sea of
 * Fog": the Wanderer from behind on the summit rock, a sea of fog below, and
 * the camps you climbed through rising out of it as crags, the nearest (High
 * Camp) large and close, the Trailhead small and lost in the haze.
 */

const W = 1200;
const H = 640;
const HORIZON = 300;

/** Deterministic jagged crag outline, so server and client agree. Its
 *  flanks run on down into the fog, which hides where they end. */
function crag(cx: number, base: number, width: number, height: number, seed: number): string {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const peakX = cx; // the flag goes on the peak
  const top = base - height;
  const foot = base + height * 0.6;
  const leftFoot = cx - width * 0.8;
  const rightFoot = cx + width * 0.8;
  const side = (fromX: number, steps: number) => {
    const pts: string[] = [];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      // concave-ish flank with knuckles of rock
      const x = fromX + (peakX - fromX) * t + (rand() - 0.5) * width * 0.1;
      const y = foot + (top - foot) * Math.pow(t, 0.8) + (rand() - 0.3) * height * 0.1;
      pts.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts;
  };
  const left = side(leftFoot, 7);
  const right = side(rightFoot, 7).reverse();
  const shoulder = `L${(peakX + width * 0.06).toFixed(1)},${(top + height * 0.08).toFixed(1)}`;
  return [`M${leftFoot},${foot}`, ...left, `L${peakX.toFixed(1)},${top}`, shoulder, ...right,
    `L${rightFoot},${foot}`, "Z"].join(" ");
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// Where each lower camp sits in the view: x across the panorama, depth 0
// (right below you) to 1 (at the horizon). Alternating sides, like a valley.
const LAYOUT = [
  { x: 712, depth: 0.97 }, // Trailhead
  { x: 818, depth: 0.88 },
  { x: 470, depth: 0.78 },
  { x: 930, depth: 0.66 },
  { x: 330, depth: 0.55 },
  { x: 1035, depth: 0.43 },
  { x: 200, depth: 0.31 },
  { x: 1112, depth: 0.19 },
  { x: 95, depth: 0.08 }, // High Camp
];

/** Feet at the origin; the right foot rests on a higher rock 14 units up. */
function Wanderer() {
  return (
    <g className={styles.viewFigure}>
      {/* hair, blown by the wind */}
      <path d="M-5.5 -95c1.5-4.5 7.5-6 11-3 1.8 1.4 2.6 3.2 2.6 5-1.2-1-2.6-1.4-4-1.2 1 .8 1.6 2 1.6 3.2-2.4-2-6-2.6-9.2-1.6z" />
      <ellipse cx="0" cy="-91" rx="5" ry="6" />
      {/* frock coat: fitted at the waist, tails to the knee */}
      <path d="M-4 -85c-5 1-8.6 4-9.6 9.4l-1.2 13.6c.6 4 1.4 8 2.2 12l-3.4 10.4 11.6-2h6.8l11 2-3-10.4c.9-4.4 1.6-9 1.6-13.4l-.8-10.2c-.9-5.4-4.4-8.4-9.2-9.4z" />
      {/* arms: the left hanging, the right on the stick */}
      <path d="M-13.4 -75l-3.4 15.4 2.8 1.2 3-14.4z" />
      <path d="M11.6 -75l6.2 12.6 2.6-1-5.4-13.4z" />
      {/* legs: one planted, one stepped up onto the higher rock */}
      <path d="M-8.4 -42l-.8 42h5.4l1.2-42z" />
      <path d="M2.6 -42l5.4 15.6.8 12.4h4.6l-1-13.4-4.2-14.6z" />
      {/* the stick */}
      <path d="M19 -62.6 25.6 -8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </g>
  );
}

export default function SummitView({ answers }: { answers: string[] }) {
  const lower = CAMPS.slice(0, CAMPS.length - 1);
  const fogTone = "#e7e6df";
  const rockNear = "#2a241f";

  return (
    <div className={styles.view} role="img"
      aria-label="The view from the summit: a sea of fog below, with the camps you climbed through rising out of it.">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={styles.viewSvg}>
        <defs>
          <linearGradient id="viewFog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fogTone} stopOpacity="0" />
            <stop offset="0.25" stopColor={fogTone} stopOpacity="0.85" />
            <stop offset="1" stopColor="#f1efe8" />
          </linearGradient>
          <filter id="viewMist" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="viewLabel" x="-10%" y="-60%" width="120%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#f4f1e8" floodOpacity="0.95" />
          </filter>
          <radialGradient id="viewSun" cx="0.72" cy="0.18" r="0.5">
            <stop offset="0" stopColor="#fff2d2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff2d2" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#viewSun)" />

        {/* distant ranges on the horizon */}
        <path d={`M0 ${HORIZON} L60 ${HORIZON - 40} L120 ${HORIZON - 18} L190 ${HORIZON - 70} L250 ${HORIZON - 30}
                  L330 ${HORIZON - 52} L400 ${HORIZON - 12} L470 ${HORIZON - 24} L560 ${HORIZON - 8}
                  L700 ${HORIZON - 14} L780 ${HORIZON - 58} L840 ${HORIZON - 26} L920 ${HORIZON - 92}
                  L990 ${HORIZON - 40} L1060 ${HORIZON - 62} L1130 ${HORIZON - 20} L1200 ${HORIZON - 44}
                  L1200 ${HORIZON + 40} L0 ${HORIZON + 40} Z`}
          fill="#8d9ba3" opacity="0.55" />
        <path d={`M0 ${HORIZON + 10} L140 ${HORIZON - 6} L260 ${HORIZON + 4} L420 ${HORIZON - 10}
                  L620 ${HORIZON + 6} L860 ${HORIZON - 8} L1040 ${HORIZON + 2} L1200 ${HORIZON - 6}
                  L1200 ${HORIZON + 40} L0 ${HORIZON + 40} Z`}
          fill="#a4afb2" opacity="0.6" />

        {/* fog over the horizon */}
        <rect x="-100" y={HORIZON - 10} width={W + 200} height={H} fill="url(#viewFog)" />

        {/* the camps below, farthest first so nearer crags overlap them */}
        {lower.map((camp, i) => ({ camp, i, ...LAYOUT[i] }))
          .sort((a, b) => b.depth - a.depth)
          .map(({ camp, i, x, depth }) => {
            const near = 1 - depth;
            const base = HORIZON + 26 + near * 250;
            const height = 26 + near * 150;
            const width = 70 + near * 230;
            const tone = mixHex(rockNear, fogTone, 0.25 + depth * 0.62);
            const flagTop = base - height - 12 - near * 14;
            const gradId = `cragFill${i}`;
            const size = 12 + near * 8;
            return (
              <g key={camp.name} className={styles.viewCamp} style={{ animationDelay: `${0.6 + near * 1.4}s` }}>
                <defs>
                  <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
                    x1="0" y1={base - height} x2="0" y2={base + height * 0.35}>
                    <stop offset="0" stopColor={tone} />
                    <stop offset="0.55" stopColor={mixHex(tone, fogTone, 0.35)} />
                    <stop offset="1" stopColor={fogTone} />
                  </linearGradient>
                </defs>
                <path d={crag(x, base, width, height, 31 + i * 97)} fill={`url(#${gradId})`} />
                {/* a fog bank wrapping its foot */}
                <ellipse cx={x} cy={base + 10} rx={width * 1.1} ry={16 + near * 26} fill="#eeece5"
                  opacity="0.92" filter="url(#viewMist)" />
                <line x1={x} y1={base - height} x2={x} y2={flagTop}
                  stroke={tone} strokeWidth={0.8 + near} />
                <path d={`M${x} ${flagTop} l${6 + near * 7} ${2.4 + near * 2.4} l${-(6 + near * 7)} ${2.4 + near * 2.4}z`}
                  fill="var(--ochre)" opacity={0.55 + near * 0.45} />
                <text x={x} y={flagTop - 7} textAnchor="middle" filter="url(#viewLabel)"
                  className={styles.viewLabel} style={{ fontSize: `${size}px` }}>
                  <tspan x={x} dy="-1.05em" className={styles.viewAnswer}>{answers[i]}</tspan>
                  <tspan x={x} dy="1.05em" className={styles.viewCampName}>{camp.name}</tspan>
                </text>
              </g>
            );
          })}

        {/* drifting fog in front of the valley */}
        <g className={styles.viewDrift} filter="url(#viewMist)">
          <ellipse cx="300" cy={H - 120} rx="360" ry="40" fill="#f3f1ea" opacity="0.75" />
          <ellipse cx="900" cy={H - 90} rx="420" ry="46" fill="#f3f1ea" opacity="0.7" />
        </g>

        {/* the summit rock, with a step for the raised foot, and the Wanderer */}
        <path d={`M250 ${H} L300 ${H - 60} L352 ${H - 92} L410 ${H - 116} L470 ${H - 136} L530 ${H - 148}
                  L566 ${H - 156} L600 ${H - 162} L610 ${H - 174} L616 ${H - 186} L630 ${H - 187} L646 ${H - 180}
                  L676 ${H - 162} L720 ${H - 138} L780 ${H - 108} L850 ${H - 66} L910 ${H - 20} L930 ${H} Z`}
          fill="#1c1814" />
        <path d={`M630 ${H - 187} L646 ${H - 180} L676 ${H - 162} L720 ${H - 138} L780 ${H - 108}
                  L850 ${H - 66} L910 ${H - 20} L930 ${H} L790 ${H} L720 ${H - 70} L668 ${H - 130} Z`}
          fill="#5a4b3e" opacity="0.5" />
        <path d={`M420 ${H - 112} L470 ${H - 120} M520 ${H - 140} L560 ${H - 142}`} stroke="#3a3129" strokeWidth="1.5" />
        <g transform={`translate(600 ${H - 161}) scale(1.8)`} color="#121010" fill="#121010">
          <Wanderer />
        </g>
      </svg>
    </div>
  );
}
