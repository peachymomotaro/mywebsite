// A still garden around a slow river: raked gravel, a few stones with their
// rings, moss at the banks, and a current that moves very gently.
// Drawn once in a 1200 × 440 frame; on narrow screens CSS turns it so the
// river runs top to bottom.

const W = 1200;
const H = 440;

/** River centreline, left to right. Items float along this line. */
export const RIVER_PATH = "M-40 250 C 160 170, 330 300, 520 236 S 860 150, 1010 226 S 1190 268, 1260 262";

const STONES = [
  { cx: 150, cy: 74, rx: 62, ry: 34, rings: 4, rotate: -8 },
  { cx: 1040, cy: 382, rx: 70, ry: 36, rings: 4, rotate: 6 },
  { cx: 868, cy: 58, rx: 30, ry: 17, rings: 3, rotate: 12 },
  { cx: 372, cy: 400, rx: 26, ry: 15, rings: 3, rotate: -4 },
];

function rakeLines() {
  const lines: string[] = [];
  for (let y = 8; y < H; y += 10) {
    const lift = (y % 30) / 10;
    lines.push(`M0 ${y} Q 150 ${y - 2 - lift} 300 ${y} T 600 ${y} T 900 ${y} T 1200 ${y}`);
  }
  return lines.join(" ");
}

function stonePath(rx: number, ry: number) {
  // A soft, slightly lopsided stone rather than a perfect ellipse.
  return `M ${-rx} 4 C ${-rx} ${-ry * 0.9}, ${-rx * 0.2} ${-ry * 1.15}, ${rx * 0.35} ${-ry}
    C ${rx * 0.95} ${-ry * 0.8}, ${rx * 1.05} ${ry * 0.3}, ${rx * 0.6} ${ry * 0.8}
    C ${rx * 0.1} ${ry * 1.15}, ${-rx * 0.9} ${ry * 0.95}, ${-rx} 4 Z`;
}

const RAKES = rakeLines();

export function GardenScene() {
  return (
    <svg
      className="garden-scene"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="garden-stone" cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="hsl(200 8% 62%)" />
          <stop offset="0.6" stopColor="hsl(200 10% 44%)" />
          <stop offset="1" stopColor="hsl(200 14% 32%)" />
        </radialGradient>
        <filter id="garden-soften" filterUnits="userSpaceOnUse" x="-100" y="0" width="1400" height="440">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="garden-river-clip">
          <path d={RIVER_PATH} fill="none" stroke="#000" strokeWidth="150" />
        </clipPath>
      </defs>

      {/* Gravel, raked. */}
      <rect width={W} height={H} fill="hsl(var(--garden-gravel))" />
      <path d={RAKES} fill="none" stroke="hsl(var(--garden-rake))" strokeWidth="1.1" />

      {/* Stones sit in cleared gravel with rings raked around them. */}
      {STONES.map((stone, index) => (
        <g key={index} transform={`translate(${stone.cx} ${stone.cy}) rotate(${stone.rotate})`}>
          <ellipse rx={stone.rx + stone.rings * 14 + 6} ry={stone.ry + stone.rings * 11 + 5} fill="hsl(var(--garden-gravel))" />
          {Array.from({ length: stone.rings }, (_, ring) => (
            <ellipse
              key={ring}
              rx={stone.rx + (ring + 1) * 14}
              ry={stone.ry + (ring + 1) * 11}
              fill="none"
              stroke="hsl(var(--garden-rake))"
              strokeWidth="1.1"
            />
          ))}
          <path d={stonePath(stone.rx, stone.ry)} transform="translate(5 9)" fill="hsl(200 20% 20% / 0.12)" />
          <path d={stonePath(stone.rx, stone.ry)} fill="url(#garden-stone)" />
          <path
            d={`M ${-stone.rx * 0.7} ${-stone.ry * 0.35} C ${-stone.rx * 0.3} ${-stone.ry * 0.95}, ${stone.rx * 0.3} ${-stone.ry * 0.95}, ${stone.rx * 0.6} ${-stone.ry * 0.55}`}
            fill="none"
            stroke="hsl(var(--garden-moss) / 0.75)"
            strokeWidth={stone.ry * 0.28}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* The river: bank, moss edge, water. */}
      <path d={RIVER_PATH} fill="none" stroke="hsl(var(--garden-bank))" strokeWidth="172" />
      <path d={RIVER_PATH} fill="none" stroke="hsl(var(--garden-moss) / 0.42)" strokeWidth="160" />
      <path d={RIVER_PATH} fill="none" stroke="hsl(var(--garden-water))" strokeWidth="150" />
      <g clipPath="url(#garden-river-clip)">
        <path d={RIVER_PATH} fill="none" stroke="hsl(var(--garden-water-deep) / 0.8)" strokeWidth="80" filter="url(#garden-soften)" />
      </g>

      {/* Slow current lines, drawn inside the water only. */}
      <g clipPath="url(#garden-river-clip)" className="garden-current">
        {[-46, -18, 12, 40].map((offset, index) => (
          <path
            key={offset}
            d={RIVER_PATH}
            transform={`translate(0 ${offset})`}
            fill="none"
            stroke="hsl(0 0% 100% / 0.55)"
            strokeWidth={index % 2 === 0 ? 1.4 : 1}
            strokeLinecap="round"
            strokeDasharray={index % 2 === 0 ? "70 330" : "40 260"}
            className={`garden-current-line garden-current-line-${index}`}
          />
        ))}
      </g>

      {/* Moss at the water's edge. */}
      {[[230, 172], [610, 318], [770, 150], [1120, 300], [60, 330]].map(([x, y], index) => (
        <g key={index} transform={`translate(${x} ${y})`} fill="hsl(var(--garden-moss))" opacity="0.7">
          <ellipse rx="22" ry="9" />
          <ellipse cx="18" cy="-4" rx="12" ry="7" />
          <ellipse cx="-16" cy="3" rx="10" ry="6" opacity="0.8" />
        </g>
      ))}

      {/* A few petals ride the current. */}
      <g className="garden-petals" clipPath="url(#garden-river-clip)">
        {[0, 1, 2, 3].map((index) => (
          <ellipse
            key={index}
            className={`garden-petal garden-petal-${index}`}
            cx="0"
            cy={[214, 258, 232, 270][index]}
            rx="5"
            ry="3"
            fill={index % 2 ? "hsl(var(--river-peach) / 0.85)" : "hsl(0 0% 100% / 0.9)"}
          />
        ))}
      </g>
    </svg>
  );
}
