export type CampPoint = {
  name: string;
  altitude: number;
  x: number;
  y: number;
  labelSide: "left" | "right";
};

/** Ten camps up the route, in the mountain SVG's 400x620 coordinates. */
export const CAMPS: CampPoint[] = [
  { name: "Trailhead", altitude: 800, x: 110, y: 580, labelSide: "right" },
  { name: "Meadow", altitude: 1600, x: 165, y: 530, labelSide: "right" },
  { name: "Treeline", altitude: 2400, x: 125, y: 478, labelSide: "right" },
  { name: "Moraine", altitude: 3200, x: 178, y: 425, labelSide: "right" },
  { name: "Base Camp", altitude: 4000, x: 150, y: 370, labelSide: "right" },
  { name: "Icefall", altitude: 4800, x: 198, y: 318, labelSide: "right" },
  { name: "The Col", altitude: 5600, x: 176, y: 262, labelSide: "right" },
  { name: "Ridge", altitude: 6400, x: 214, y: 205, labelSide: "right" },
  { name: "High Camp", altitude: 7200, x: 196, y: 145, labelSide: "right" },
  { name: "Summit", altitude: 8000, x: 210, y: 62, labelSide: "right" },
];

export function formatAltitude(metres: number): string {
  return `${metres.toLocaleString("en-GB")} m`;
}

type Sky = { top: string; mid: string; bottom: string; stars: number };

// Dawn in the valley, bright day, dusk on the high ridges, night at the top.
const STOPS: [number, Sky][] = [
  [0, { top: "#7fb3d8", mid: "#c9dbe0", bottom: "#f4cf9a", stars: 0 }],
  [0.35, { top: "#3f86c8", mid: "#86bde3", bottom: "#d4ecf5", stars: 0 }],
  [0.7, { top: "#25285f", mid: "#7a4f7f", bottom: "#ec8a5c", stars: 0.35 }],
  [1, { top: "#04071a", mid: "#141a46", bottom: "#33306b", stars: 1 }],
];

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Sky colours at a height between 0 (trailhead) and 1 (summit). */
export function skyAt(height: number): Sky {
  const h = Math.max(0, Math.min(1, height));
  for (let i = 1; i < STOPS.length; i++) {
    const [h1, s1] = STOPS[i];
    const [h0, s0] = STOPS[i - 1];
    if (h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return {
        top: mix(s0.top, s1.top, t),
        mid: mix(s0.mid, s1.mid, t),
        bottom: mix(s0.bottom, s1.bottom, t),
        stars: s0.stars + (s1.stars - s0.stars) * t,
      };
    }
  }
  return STOPS[STOPS.length - 1][1];
}
