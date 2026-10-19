"use client";

import Link from "next/link";
import {
  TIME_BUDGET_OPTIONS,
  parseTimeBudgetSearchParam,
} from "@/lib/reading-river/time-budgets";
import { readingRiverPath } from "@/lib/reading-river/routes";

export { TIME_BUDGET_OPTIONS, parseTimeBudgetSearchParam };

type TimeBudgetPickerProps = {
  selectedMinutes: number | null;
  onSelect?: (minutes: number | null) => void;
};

function getHref(minutes: number | null) {
  return minutes === null ? readingRiverPath() : `${readingRiverPath()}?time=${minutes}`;
}

export function TimeBudgetPicker({ selectedMinutes, onSelect }: TimeBudgetPickerProps) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>, minutes: number | null) {
    // Preserve browser navigation and open-in-new-tab for modified clicks.
    if (!onSelect || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    onSelect(minutes);
  }

  function renderOption(minutes: number | null, label: string) {
    return (
      <Link
        key={minutes ?? "any"}
        href={getHref(minutes)}
        prefetch={false}
        onClick={(event) => handleClick(event, minutes)}
        aria-current={selectedMinutes === minutes ? "page" : undefined}
        className={selectedMinutes === minutes ? "river-time-pill river-time-pill-active" : "river-time-pill"}
      >
        {label}
      </Link>
    );
  }

  return (
    <section className="river-time-picker">
      <p className="river-section-label">Choose a time</p>
      <div className="river-time-picker-options">
        {renderOption(null, "Any time")}
        {TIME_BUDGET_OPTIONS.map((minutes) => renderOption(minutes, `${minutes} min`))}
      </div>
    </section>
  );
}
