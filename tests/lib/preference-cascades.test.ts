import { describe, expect, it } from "vitest";
import { figureOpinion } from "@/lib/preference-cascades/model";

describe("Figure 4.3 teaching approximation", () => {
  it("preserves the pictured 20 → 35 → 40 relationship", () => {
    expect(figureOpinion(0)).toBe(30);
    expect(figureOpinion(20)).toBe(35);
    expect(figureOpinion(40)).toBe(40);
  });

  it("has only one attracting equilibrium, including above 60%", () => {
    for (let start = 0; start <= 100; start += 0.25) {
      const next = figureOpinion(start);
      if (start < 40) {
        expect(next).toBeGreaterThan(start);
        expect(next).toBeLessThanOrEqual(40);
      } else if (start > 40) {
        expect(next).toBeLessThan(start);
        expect(next).toBeGreaterThanOrEqual(40);
      } else expect(next).toBe(40);
    }
  });

  it("converges step by step from every integer starting expectation", () => {
    for (let start = 0; start <= 100; start++) {
      let current = start;
      for (let round = 0; round < 100; round++) {
        const next = figureOpinion(current);
        expect(Math.abs(next - 40)).toBeLessThanOrEqual(Math.abs(current - 40));
        current = next;
      }
      expect(current).toBeCloseTo(40, 6);
    }
  });
});

describe("transparent threshold population", () => {
  it("counts public expression from thresholds, including equality", async () => {
    const { publicOpinion } = await import("@/lib/preference-cascades/model");
    expect(publicOpinion([0, 20, 20, 30, 40, 50, 60, 70, 80, 90], 10)).toBe(10);
    expect(publicOpinion([0, 20, 20, 30, 40, 50, 60, 70, 80, 90], 20)).toBe(30);
    expect(publicOpinion([0, 100], 100)).toBe(100);
  });

  it("changes only person 2 in the comparison, preserving private preferences", async () => {
    const { population } = await import("@/lib/preference-cascades/model");
    const baseline = population(20);
    const changed = population(10);
    expect(baseline).toHaveLength(10);
    expect(baseline.filter((t, i) => t !== changed[i])).toEqual([20]);
    expect(baseline).toEqual([0, 20, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it("computes a cascade after closing a threshold gap, without hard-coded outcomes", async () => {
    const { population, thresholdHistory } = await import("@/lib/preference-cascades/model");
    expect(thresholdHistory(population(20), 0)).toEqual([0, 10]);
    expect(thresholdHistory(population(10), 0)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it("does not imply every threshold change causes a cascade", async () => {
    const { population, thresholdHistory } = await import("@/lib/preference-cascades/model");
    expect(thresholdHistory(population(30), 0)).toEqual([0, 10]);
    expect(thresholdHistory(population(20), 20).at(-1)).toBe(100);
    expect(thresholdHistory(population(100), 0).at(-1)).toBe(10);
  });

  it("reproduces every round from the same population and expectation", async () => {
    const { population, thresholdHistory, publicOpinion } = await import("@/lib/preference-cascades/model");
    for (let threshold = 0; threshold <= 100; threshold += 10) {
      for (let start = 0; start <= 100; start += 5) {
        const people = population(threshold);
        const history = thresholdHistory(people, start);
        expect(thresholdHistory(people, start)).toEqual(history);
        history.slice(1).forEach((value, i) => expect(value).toBe(publicOpinion(people, history[i])));
        const final = history.at(-1)!;
        expect(publicOpinion(people, final)).toBe(final);
        expect(history.length).toBeLessThanOrEqual(12);
      }
    }
  });
});
