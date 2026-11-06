/** Illustrative points read from the shape of Figure 4.3, not Kuran's data or formula. */
export const FIGURE_POINTS = [
  [0, 30], [20, 35], [40, 40], [60, 52], [80, 70], [100, 95],
] as const;

export function figureOpinion(expectation: number): number {
  const x = Math.max(0, Math.min(100, expectation));
  for (let i = 1; i < FIGURE_POINTS.length; i++) {
    const [rightX, rightY] = FIGURE_POINTS[i];
    const [leftX, leftY] = FIGURE_POINTS[i - 1];
    if (x <= rightX) return leftY + (rightY - leftY) * (x - leftX) / (rightX - leftX);
  }
  return FIGURE_POINTS[FIGURE_POINTS.length - 1][1];
}

export function figureHistory(start: number): number[] {
  const values = [start];
  // Every segment moves strictly towards 40; this tolerance is only for display.
  while (Math.abs(values[values.length - 1] - 40) > 0.01) {
    values.push(figureOpinion(values[values.length - 1]));
  }
  return values;
}

/** Ten people privately favour change. Only person 2's public threshold is editable. */
export function population(secondPersonThreshold: number): number[] {
  return [0, secondPersonThreshold, 20, 30, 40, 50, 60, 70, 80, 90];
}

export function publicOpinion(thresholds: readonly number[], expectation: number): number {
  return thresholds.filter((threshold) => threshold <= expectation).length / thresholds.length * 100;
}

export function thresholdHistory(thresholds: readonly number[], start: number): number[] {
  const values = [start];
  // A nondecreasing threshold map is monotone after its first update. It can
  // visit at most N + 1 distinct population counts before reaching a fixed point.
  for (let round = 0; round <= thresholds.length + 1; round++) {
    const next = publicOpinion(thresholds, values[values.length - 1]);
    if (next === values[values.length - 1]) return values;
    values.push(next);
  }
  return values;
}
