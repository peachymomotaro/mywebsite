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

// After Friedrich's "Wanderer above the Sea of Fog": you start inside a grey
// overcast, and climb out into pale, warm light above a sea of fog.
// `fog` is how high the sea of fog reaches (1 = fills the view, 0 = far below).
type Sky = { top: string; mid: string; bottom: string; fog: number };

const STOPS: [number, Sky][] = [
  [0, { top: "#8f9a9e", mid: "#adb4b3", bottom: "#c2c5bf", fog: 1 }],
  [0.4, { top: "#9fadb4", mid: "#c6cbc4", bottom: "#ddd6c4", fog: 0.62 }],
  [0.75, { top: "#a9b8c0", mid: "#d6d3c3", bottom: "#e9dcbc", fog: 0.34 }],
  [1, { top: "#9fb2bd", mid: "#dcd5bf", bottom: "#efd8a6", fog: 0.12 }],
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
        fog: s0.fog + (s1.fog - s0.fog) * t,
      };
    }
  }
  return STOPS[STOPS.length - 1][1];
}
