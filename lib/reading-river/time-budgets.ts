export const TIME_BUDGET_OPTIONS = [5, 10, 15, 30, 45] as const;
export const TIME_BUDGET_SELECTIONS = [null, ...TIME_BUDGET_OPTIONS] as const;

export type TimeBudgetKey = "any" | `${(typeof TIME_BUDGET_OPTIONS)[number]}`;

export function getTimeBudgetKey(minutes: number | null): TimeBudgetKey {
  return minutes === null ? "any" : String(minutes) as TimeBudgetKey;
}

export function parseTimeBudgetSearchParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  return TIME_BUDGET_OPTIONS.includes(parsed as (typeof TIME_BUDGET_OPTIONS)[number])
    ? parsed
    : null;
}
