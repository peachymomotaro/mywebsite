import { describe, expect, it } from "vitest";
import {
  drawRiver,
  effectivePriority,
  driftWeight,
  recencyFactor,
  settleUnreadAppearance,
  type DriftCandidate,
} from "@/lib/reading-river/drift";
import { collectStaleAppearances } from "@/lib/reading-river/drift-store";

const now = new Date("2026-11-04T10:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

function item(id: string, overrides: Partial<DriftCandidate> = {}): DriftCandidate {
  return {
    id,
    priorityScore: null,
    priorityAssignedAt: null,
    createdAt: daysAgo(30),
    lastSurfacedAt: null,
    lastOpenedAt: null,
    restingUntil: null,
    snoozedUntil: null,
    driftMisses: 0,
    snoozeLevel: 0,
    ...overrides,
  };
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("drift weights", () => {
  it("counts priority for fourteen days from assignment, then returns to ordinary chance", () => {
    expect(effectivePriority(item("a", { priorityScore: 8, priorityAssignedAt: daysAgo(13) }), now)).toBe(8);
    expect(effectivePriority(item("a", { priorityScore: 8, priorityAssignedAt: daysAgo(15) }), now)).toBe(0);
    // Without a renewal, the clock runs from when the item was added.
    expect(effectivePriority(item("a", { priorityScore: 8, createdAt: daysAgo(2) }), now)).toBe(8);
  });

  it("reduces the chance of recently surfaced items and recovers it over days", () => {
    expect(recencyFactor(item("a", { lastSurfacedAt: now }), now)).toBe(0.25);
    expect(recencyFactor(item("a", { lastSurfacedAt: daysAgo(2) }), now)).toBeCloseTo(0.55);
    expect(recencyFactor(item("a", { lastSurfacedAt: daysAgo(9) }), now)).toBe(1);
  });

  it("never gives an eligible item zero chance", () => {
    expect(driftWeight(item("a", { lastSurfacedAt: now }), now)).toBeGreaterThan(0);
  });

  it("makes priority items appear more often without excluding the rest", () => {
    const candidates = [
      item("priority", { priorityScore: 10, createdAt: daysAgo(1) }),
      ...Array.from({ length: 9 }, (_, index) => item(`plain-${index}`)),
    ];
    const rng = seeded(7);
    const counts = new Map<string, number>();
    for (let round = 0; round < 3000; round += 1) {
      for (const item of drawRiver({ candidates, now, rng })) {
        counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
      }
    }
    expect(counts.get("priority")!).toBeGreaterThan(counts.get("plain-0")! * 2);
    for (let index = 0; index < 9; index += 1) expect(counts.get(`plain-${index}`)).toBeGreaterThan(0);
  });
});

describe("drawing afloat", () => {
  it("draws three distinct items and keeps steady afloat in place", () => {
    const candidates = ["a", "b", "c", "d", "e"].map((id) => item(id));
    const afloat = drawRiver({ candidates, keep: [candidates[3]], now, rng: seeded(1) });
    expect(afloat).toHaveLength(3);
    expect(afloat[0].id).toBe("d");
    expect(new Set(afloat.map((item) => item.id)).size).toBe(3);
  });

  it("avoids just-drifted items when alternatives exist", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"].map((id) => item(id));
    const avoid = new Set(["a", "b", "c"]);
    for (let seed = 0; seed < 50; seed += 1) {
      const afloat = drawRiver({ candidates, avoid, now, rng: seeded(seed) });
      expect(afloat.map((item) => item.id).sort()).toEqual(["d", "e", "f"]);
    }
  });

  it("tops up from resting, then drifted items, when the collection is small", () => {
    const candidates = [
      item("a"),
      item("b", { restingUntil: new Date(now.getTime() + 3_600_000) }),
      item("c"),
      item("d"),
    ];
    const afloat = drawRiver({ candidates, avoid: new Set(["c", "d"]), now, rng: seeded(3) });
    expect(afloat.map((item) => item.id).slice(0, 2).sort()).toEqual(["a", "b"]);
    expect(afloat).toHaveLength(3);
  });

  it("never surfaces snoozed items and copes with fewer than three", () => {
    const candidates = [item("a"), item("b", { snoozedUntil: new Date(now.getTime() + 86_400_000) })];
    expect(drawRiver({ candidates, now }).map((item) => item.id)).toEqual(["a"]);
    expect(drawRiver({ candidates: [], now })).toEqual([]);
  });
});

describe("unread appearances and snoozing", () => {
  it("snoozes for three days after two unread days, then a week after one more", () => {
    let current = item("a");
    const first = settleUnreadAppearance(current, "2026-11-01", now)!;
    expect(first).toEqual({ driftMisses: 1, snoozeLevel: 0 });
    current = { ...current, ...first };

    const second = settleUnreadAppearance(current, "2026-11-02", now)!;
    expect(second.snoozeLevel).toBe(1);
    expect(second.snoozedUntil).toEqual(new Date(now.getTime() + 3 * 86_400_000));
    current = { ...current, ...second };

    const third = settleUnreadAppearance(current, "2026-11-08", now)!;
    expect(third.snoozeLevel).toBe(2);
    expect(third.snoozedUntil).toEqual(new Date(now.getTime() + 7 * 86_400_000));
  });

  it("does not count an appearance if the item was opened that day or later", () => {
    const opened = item("a", { lastOpenedAt: new Date("2026-11-02T18:00:00Z") });
    expect(settleUnreadAppearance(opened, "2026-11-02", now)).toBeNull();
  });

  it("counts only looked-at afloat from earlier days, once per day", () => {
    const stale = collectStaleAppearances({
      any: { ids: ["a", "b", "c"], drawnOn: "2026-11-03", seenIds: ["a", "b"] },
      "10": { ids: ["a", "d"], drawnOn: "2026-11-03", seenIds: ["a"] },
      // Drifted away before the day ended: "x" left ids, so it never counts.
      "15": { ids: ["e"], drawnOn: "2026-11-03", seenIds: ["x"] },
      // Today's selection is still standing.
      "30": { ids: ["f"], drawnOn: "2026-11-04", seenIds: ["f"] },
    }, "2026-11-04");
    expect(Object.fromEntries(Array.from(stale, ([id, days]) => [id, days.size]))).toEqual({ a: 1, b: 1 });
  });
});
