"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TimeBudgetPicker } from "@/components/reading-river/time-budget-picker";
import {
  getTimeBudgetKey,
  parseTimeBudgetSearchParam,
  type TimeBudgetKey,
} from "@/lib/reading-river/time-budgets";

export type HomeSpotlightCards = Record<
  TimeBudgetKey,
  { priority: ReactNode; stream: ReactNode }
>;

type HomeSpotlightsProps = {
  initialMinutes: number | null;
  cards: HomeSpotlightCards;
};

export function HomeSpotlights({ initialMinutes, cards }: HomeSpotlightsProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);

  useEffect(() => {
    setSelectedMinutes(initialMinutes);
  }, [initialMinutes]);

  useEffect(() => {
    function syncFromAddressBar() {
      const params = new URLSearchParams(window.location.search);
      setSelectedMinutes(parseTimeBudgetSearchParam(params.get("time") ?? undefined));
    }

    window.addEventListener("popstate", syncFromAddressBar);
    return () => window.removeEventListener("popstate", syncFromAddressBar);
  }, []);

  function selectTimeBudget(minutes: number | null) {
    if (minutes === selectedMinutes) return;

    const url = new URL(window.location.href);
    if (minutes === null) {
      url.searchParams.delete("time");
    } else {
      url.searchParams.set("time", String(minutes));
    }

    // A shallow URL update avoids re-running authentication and DB queries.
    // React Server Actions still revalidate the page after mutations.
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    setSelectedMinutes(minutes);
  }

  const displayed = cards[getTimeBudgetKey(selectedMinutes)];

  return (
    <>
      <section className="river-spotlight-grid">
        {displayed.priority}
        {displayed.stream}
      </section>
      <TimeBudgetPicker selectedMinutes={selectedMinutes} onSelect={selectTimeBudget} />
    </>
  );
}
