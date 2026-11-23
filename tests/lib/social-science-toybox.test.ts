import { describe, expect, it } from "vitest";
import {
  dilemmaPayoff, dictatorPayoff, experiments, fixedChoices, publicGoodsPayoffs,
  responseFromInput, trustPayoff,
} from "@/lib/social-science-toybox/games";
import {
  assignPowerCondition, gameComparison, powerComparison, powerConditions,
} from "@/lib/social-science-toybox/results";

describe("toybox choices and payoffs", () => {
  it("uses distinct slugs and preserves the study's discrete choices", () => {
    expect(new Set(experiments.map(({ id }) => id)).size).toBe(experiments.length);
    expect(fixedChoices["trust-sender"]?.map(({ value }) => value)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(fixedChoices["trust-returner"]?.map(({ value }) => value)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(fixedChoices["prisoners-dilemma"]?.map(({ label }) => label)).toEqual(["Orange", "Purple"]);
  });

  it("accepts cents, keeps zero valid and rejects responses outside the original scales", () => {
    expect(responseFromInput("dictator", "0")).toBe(0);
    expect(responseFromInput("dictator", "2.51")).toBe(2.51);
    expect(responseFromInput("public-goods", "4.00")).toBe(4);
    for (const input of ["", ".", "-1", "4.01", "0.001", "1e0", "NaN"]) {
      expect(responseFromInput("public-goods", input)).toBeNull();
    }
    expect(responseFromInput("trust-sender", "2.1")).toBeNull();
    expect(responseFromInput("trust-returner", "15")).toBeNull();
    expect(responseFromInput("prisoners-dilemma", "2")).toBeNull();
  });

  it("calculates both players' payoffs for the split and the trust roles", () => {
    expect(dictatorPayoff(2.25)).toEqual([2.75, 2.25]);
    expect(trustPayoff(0, 100)).toEqual([3, 0]);
    expect(trustPayoff(3, 50)).toEqual([4.5, 4.5]);
    expect(trustPayoff(2.5, 0)).toEqual([0.5, 7.5]);
    expect(trustPayoff(1, 40)).toEqual([3.2, 1.8]);
  });

  it("doubles group contributions and divides the proceeds equally", () => {
    expect(publicGoodsPayoffs([4, 4, 4, 4])).toEqual([8, 8, 8, 8]);
    expect(publicGoodsPayoffs([0, 4, 4, 4])).toEqual([10, 6, 6, 6]);
    expect(publicGoodsPayoffs([4, 0, 0, 0])).toEqual([2, 6, 6, 6]);
    expect(publicGoodsPayoffs([0.01, 0, 0, 0])[1]).toBeCloseTo(4.005);
  });

  it("keeps the four colour payoffs in the correct player order", () => {
    expect(dilemmaPayoff(1, 1)).toEqual([6, 6]);
    expect(dilemmaPayoff(0, 0)).toEqual([4, 4]);
    expect(dilemmaPayoff(1, 0)).toEqual([2, 8]);
    expect(dilemmaPayoff(0, 1)).toEqual([8, 2]);
  });
});

describe("published comparisons", () => {
  it.each([
    ["dictator", 2.151, 2.034, 1052],
    ["trust-sender", 2.045, 1.559, 1052],
    ["trust-returner", 46.635, 45.01, 1052],
    ["public-goods", 2.956, 2.256, 1050],
    ["prisoners-dilemma", 63.6, 69.8, 1052],
  ] as const)("maps %s to its original units and paired analysis sample", (id, human, ai, n) => {
    expect(gameComparison(id)).toEqual({
      human: { value: human, n },
      ai: { value: ai, n },
    });
  });

  it("assigns one power scenario and retains the matched denominators in both arms", () => {
    const [low, high] = powerConditions;
    expect(assignPowerCondition(() => 0.499)).toBe(low);
    expect(assignPowerCondition(() => 0.5)).toBe(high);
    expect(powerComparison(low)).toEqual({
      human: { value: 40100 / 513, n: 513 },
      ai: { value: 47600 / 513, n: 513 },
    });
    expect(powerComparison(high)).toEqual({
      human: { value: 34100 / 539, n: 539 },
      ai: { value: 17000 / 539, n: 539 },
    });
  });
});
