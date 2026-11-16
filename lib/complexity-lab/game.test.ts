import { describe, expect, it, vi } from "vitest";
import { INITIAL_TUNING, createWorld, getMetrics, interactWorld, stepWorld, actionWorld, type WorldId } from "./game";

describe("complexity lab simulations", () => {
  const worlds: WorldId[] = ["garden", "flock", "outbreak", "evolution", "city"];

  it.each(worlds)("%s creates a working model and metrics", world => {
    const tuning = { ...INITIAL_TUNING };
    const state = createWorld(world, tuning);
    const initial = getMetrics(state, tuning);
    expect(initial.labels).toHaveLength(3);
    expect(initial.progress).toBeGreaterThanOrEqual(0);
    expect(initial.progress).toBeLessThanOrEqual(1);
    for (let i = 0; i < 12; i++) stepWorld(state, tuning);
    const metrics = getMetrics(state, tuning);
    expect(state.tick).toBe(12);
    expect(metrics.primary).toBeTruthy();
    expect(Number.isFinite(metrics.progress)).toBe(true);
  });

  it("moves a glider four steps diagonally under Conway's rules", () => {
    const tuning = { ...INITIAL_TUNING };
    const state = createWorld("garden", tuning);
    state.cells.fill(0);
    const cells = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
    for (const [x, y] of cells) state.cells[y * 48 + x] = 1;
    for (let i = 0; i < 4; i++) stepWorld(state, tuning);
    for (const [x, y] of cells) expect(state.cells[(y + 1) * 48 + x + 1]).toBe(1);
    expect(state.cells.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("supports manual planting and clearing", () => {
    const tuning = { ...INITIAL_TUNING };
    const state = createWorld("garden", tuning);
    state.cells.fill(0);
    interactWorld(state, 10, 10, tuning);
    expect(state.cells[0]).toBe(1);
    interactWorld(state, 10, 10, tuning, true);
    expect(state.cells[0]).toBe(0);
    actionWorld(state, "glider", tuning);
    expect(state.cells.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("vaccination never changes already recovered or infected people", () => {
    const tuning = { ...INITIAL_TUNING };
    const state = createWorld("outbreak", tuning);
    state.people[1].status = "r";
    state.people[2].status = "i";
    actionWorld(state, "vaccinate", tuning);
    expect(state.people[1].status).toBe("r");
    expect(state.people[2].status).toBe("i");
    expect(state.people.some(person => person.status === "v")).toBe(true);
  });

  it("makes evolution responsive to a shifted selective environment", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const tuning = { ...INITIAL_TUNING, mutation: 0, habitat: 90 };
      const state = createWorld("evolution", tuning);
      state.traits = Array.from({ length: 160 }, (_, i) => i < 80 ? 0.1 : 0.9);
      for (let i = 0; i < 30; i++) stepWorld(state, tuning);
      const mean = state.traits.reduce((a, b) => a + b, 0) / state.traits.length;
      expect(mean).toBeGreaterThan(0.7);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("city produces a bounded segregation metric", () => {
    const tuning = { ...INITIAL_TUNING, similarity: 35 };
    const state = createWorld("city", tuning);
    for (let i = 0; i < 150; i++) stepWorld(state, tuning);
    const m = getMetrics(state, tuning);
    expect(Number(m.primary.replace("%", ""))).toBeGreaterThanOrEqual(0);
    expect(Number(m.primary.replace("%", ""))).toBeLessThanOrEqual(100);
  });
});
