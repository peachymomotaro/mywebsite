import Link from "next/link";

export const TIME_BUDGET_OPTIONS = [5, 10, 15, 30, 45] as const;

type TimeBudgetPickerProps = {
  selectedMinutes: number | null;
};

export function parseTimeBudgetSearchParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  return TIME_BUDGET_OPTIONS.includes(parsed as (typeof TIME_BUDGET_OPTIONS)[number])
    ? parsed
    : null;
}

function getHref(minutes: number | null) {
  return minutes === null ? "/" : `/?time=${minutes}`;
}

export function TimeBudgetPicker({ selectedMinutes }: TimeBudgetPickerProps) {
  return (
    <section className="river-time-picker">
      <p className="river-section-label">Choose a time</p>
      <div className="river-time-picker-options">
        <Link
          href={getHref(null)}
          aria-current={selectedMinutes === null ? "page" : undefined}
          className={selectedMinutes === null ? "river-time-pill river-time-pill-active" : "river-time-pill"}
        >
          Any time
        </Link>

        {TIME_BUDGET_OPTIONS.map((minutes) => (
          <Link
            key={minutes}
            href={getHref(minutes)}
            aria-current={selectedMinutes === minutes ? "page" : undefined}
            className={
              selectedMinutes === minutes
                ? "river-time-pill river-time-pill-active"
                : "river-time-pill"
            }
          >
            {minutes} min
          </Link>
        ))}
      </div>
    </section>
  );
}
