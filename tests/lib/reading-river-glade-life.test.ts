import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createLife } from "@/components/reading-river/glade-life";

function world() {
  const curve = new THREE.CatmullRomCurve3([[0, -200], [3, -60], [-2, 0], [2, 60], [0, 200]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const samples = curve.getSpacedPoints(400);
  const riverLength = curve.getLength();
  const distanceToRiver = (x: number, z: number) => Math.min(...samples.map((point) => Math.hypot(point.x - x, point.z - z)));
  const arcNear = (x: number, z: number) => {
    let best = 0;
    samples.forEach((point, index) => {
      if (Math.hypot(point.x - x, point.z - z) < Math.hypot(samples[best].x - x, samples[best].z - z)) best = index;
    });
    return (best / 400) * riverLength;
  };
  let seed = 7;
  return {
    scene: new THREE.Scene(),
    curve,
    riverLength,
    halfWidth: 4.4,
    groundHeight: () => 0.3,
    distanceToRiver,
    arcNear,
    ripple: vi.fn(),
    random: () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; },
    keep: <T extends { dispose: () => void }>(thing: T) => thing,
    trees: [{ x: 12, z: 0, s: 2 }, { x: -14, z: 8, s: 2.5 }],
    gust: { value: 0 },
    pool: { centre: new THREE.Vector3(-12, 0, 0), radius: 6 },
    lilyPads: [new THREE.Vector3(-9, -0.27, 2), new THREE.Vector3(-14, -0.27, -3)],
  };
}

describe("life in the glade", () => {
  it("runs an hour of small events without piling things up", () => {
    const glade = world();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const life = createLife(glade);
    const focus = new THREE.Vector3(8, 0, 0);
    life.settle(focus);
    const settled = glade.scene.children.length;

    let peak = 0;
    for (; now < 60 * 60 * 1000; now += 50) {
      life.update(now, 0.05, focus);
      peak = Math.max(peak, glade.scene.children.length);
    }

    // Frogs, fish and ducks have all disturbed the water by now.
    expect(glade.ripple.mock.calls.length).toBeGreaterThan(100);
    // Occasional creatures come and go: never more than a handful at once.
    expect(peak - settled).toBeLessThan(14);
    expect(glade.gust.value).toBeGreaterThanOrEqual(0);
    vi.restoreAllMocks();
    // An hour of frames takes a few seconds when the whole suite is running.
  }, 30_000);
});
