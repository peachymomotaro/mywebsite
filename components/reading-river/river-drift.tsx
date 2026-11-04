"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  letDriftOnAction,
  letOneDriftOnAction,
  noteDriftSeenAction,
  wakeSnoozedAction,
} from "@/app/reading-river/actions/drift";
import { GardenScene } from "@/components/reading-river/garden-scene";
import { LiftedItem, RiverBankLists } from "@/components/reading-river/river-bank";
import { TimeBudgetPicker } from "@/components/reading-river/time-budget-picker";
import type { DriftView, DriftViews, RiverBank, RiverItem } from "@/lib/reading-river/drift-store";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { getTimeBudgetKey, parseTimeBudgetSearchParam } from "@/lib/reading-river/time-budgets";

/** How long items must stay afloat on screen, in a visible tab, to count as seen. */
const SEEN_AFTER_MS = 4000;
const LEAVE_MS = 1300;
const ARRIVE_MS = 2300;

/** Where each place sits on the river, as fractions of the garden. */
const PLACES = [
  { x: 0.16, y: 0.52, tilt: -2.5 },
  { x: 0.46, y: 0.55, tilt: 1.5 },
  { x: 0.76, y: 0.45, tilt: -1 },
];

type Phase = "still" | "leaving" | "arriving";

function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function formatWhen(iso: string, future = false) {
  const date = new Date(iso);
  const days = Math.round(Math.abs(date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return future ? "later today" : "today";
  if (days === 1) return future ? "tomorrow" : "yesterday";
  return `on ${date.toLocaleDateString(undefined, { weekday: "long" })}`;
}

type RiverDriftProps = {
  initialMinutes: number | null;
  views: DriftViews;
  bank: RiverBank;
};

export function RiverDrift({ initialMinutes, views: serverViews, bank }: RiverDriftProps) {
  const router = useRouter();
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [views, setViews] = useState(serverViews);
  const [phase, setPhase] = useState<Phase>("still");
  const [driftingId, setDriftingId] = useState<string | null>(null);
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isWaking, startWaking] = useTransition();
  const seenRef = useRef(new Set<string>());
  const bankRef = useRef<HTMLDivElement>(null);

  const busy = phase !== "still" || driftingId !== null;
  const key = getTimeBudgetKey(selectedMinutes);
  const view: DriftView = views[key];
  const idsKey = view.afloat.map((item) => item.id).join();
  const lifted = view.afloat.find((item) => item.id === liftedId) ?? null;

  // Server renders (after reading, removing, opening…) keep the steady items
  // and refill any gap; only the newcomers drift in.
  useEffect(() => {
    setViews((current) => {
      const before = new Set(current[key].afloat.map((item) => item.id));
      const arriving = serverViews[key].afloat.map((item) => item.id).filter((id) => !before.has(id));
      if (arriving.length > 0 && before.size > 0) setArrivingIds(new Set(arriving));
      return serverViews;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverViews]);

  useEffect(() => setSelectedMinutes(initialMinutes), [initialMinutes]);

  useEffect(() => {
    function syncFromAddressBar() {
      const params = new URLSearchParams(window.location.search);
      setSelectedMinutes(parseTimeBudgetSearchParam(params.get("time") ?? undefined));
    }
    // Coming back from an article: show it on the bank, not on the water.
    function refreshOnReturn(event: PageTransitionEvent) {
      if (event.persisted) router.refresh();
    }
    window.addEventListener("popstate", syncFromAddressBar);
    window.addEventListener("pageshow", refreshOnReturn);
    return () => {
      window.removeEventListener("popstate", syncFromAddressBar);
      window.removeEventListener("pageshow", refreshOnReturn);
    };
  }, [router]);

  useEffect(() => {
    if (arrivingIds.size === 0) return;
    const timer = setTimeout(() => setArrivingIds(new Set()), prefersReducedMotion() ? 200 : ARRIVE_MS);
    return () => clearTimeout(timer);
  }, [arrivingIds]);

  // Count meaningful exposure only: the same items stayed in a visible tab.
  useEffect(() => {
    if (!idsKey || busy) return;
    const marker = `${key}:${idsKey}`;
    if (seenRef.current.has(marker)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function arm() {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        seenRef.current.add(marker);
        void noteDriftSeenAction(key, idsKey.split(",")).catch(() => undefined);
      }, SEEN_AFTER_MS);
    }
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [key, idsKey, busy]);

  function selectTimeBudget(minutes: number | null) {
    if (minutes === selectedMinutes || busy) return;
    const url = new URL(window.location.href);
    if (minutes === null) url.searchParams.delete("time");
    else url.searchParams.set("time", String(minutes));
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    setSelectedMinutes(minutes);
    setLiftedId(null);
  }

  function lift(item: RiverItem) {
    setLiftedId((current) => (current === item.id ? null : item.id));
    if (liftedId !== item.id) {
      requestAnimationFrame(() => bankRef.current?.focus({ preventScroll: true }));
      bankRef.current?.scrollIntoView?.({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }

  async function driftOn() {
    if (busy) return;
    const reduced = prefersReducedMotion();
    const previous = new Set(view.afloat.map((item) => item.id));
    setLiftedId(null);
    setPhase("leaving");
    setAnnouncement("");
    try {
      const [next] = await Promise.all([letDriftOnAction(key), wait(reduced ? 0 : LEAVE_MS)]);
      setViews((current) => ({ ...current, [key]: next }));
      setArrivingIds(new Set(next.afloat.map((item) => item.id).filter((id) => !previous.has(id))));
      setAnnouncement(next.stillWater
        ? "Nothing else is upstream just now. These are everything within reach."
        : `${next.afloat.length === 1 ? "One new piece" : `${next.afloat.length} new pieces`} drifted into view.`);
      setPhase(reduced ? "still" : "arriving");
      if (!reduced) {
        await wait(ARRIVE_MS);
        setPhase("still");
      }
    } catch {
      setPhase("still");
      setAnnouncement("The river didn't move just now. Try again in a moment.");
    }
  }

  async function driftOne(id: string) {
    if (busy) return;
    const reduced = prefersReducedMotion();
    const previous = view.afloat.map((item) => item.id);
    setDriftingId(id);
    setLiftedId(null);
    try {
      const [next] = await Promise.all([letOneDriftOnAction(key, id), wait(reduced ? 0 : LEAVE_MS)]);
      const arrived = next.afloat.map((item) => item.id).filter((itemId) => !previous.includes(itemId));
      setViews((current) => ({ ...current, [key]: next }));
      setArrivingIds(new Set(arrived));
      setAnnouncement(arrived.length > 0 ? "It drifted on, and another came into view." : "It drifted on for now.");
    } catch {
      setAnnouncement("That didn't drift on just now. Try again in a moment.");
    } finally {
      setDriftingId(null);
    }
  }

  const canDriftOn = view.inCirculation > view.afloat.length;

  return (
    <section className="river-drift" aria-labelledby="river-drift-heading" data-phase={phase}>
      <h2 id="river-drift-heading" className="river-sr-only">Drifting by</h2>

      <div className="garden" data-count={view.afloat.length}>
        <GardenScene />

        {view.afloat.length > 0 ? (
          <ul className="garden-afloat" aria-busy={busy}>
            {view.afloat.map((item, index) => {
              const place = PLACES[index] ?? PLACES[PLACES.length - 1];
              const meta = [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ");
              return (
                <li
                  key={item.id}
                  className={[
                    "garden-float",
                    phase === "leaving" || driftingId === item.id ? "garden-float-leaving" : null,
                    arrivingIds.has(item.id) ? "garden-float-arriving" : null,
                    liftedId === item.id ? "garden-float-lifted" : null,
                  ].filter(Boolean).join(" ")}
                  style={{
                    "--x": place.x,
                    "--y": place.y,
                    "--tilt": `${place.tilt}deg`,
                    "--i": index,
                  } as React.CSSProperties}
                >
                  <div className="garden-float-drift">
                    <button
                      type="button"
                      className="garden-float-card"
                      aria-pressed={liftedId === item.id}
                      aria-controls="river-bank-lifted"
                      onClick={() => lift(item)}
                      disabled={busy}
                    >
                      <span className="garden-float-title">{item.title}</span>
                      <span className="garden-float-meta">
                        {meta}
                        {item.hasPriority ? <span className="garden-float-priority">Priority</span> : null}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyRiver
            view={view}
            selectedMinutes={selectedMinutes}
            onAnyTime={() => selectTimeBudget(null)}
            onWake={() => startWaking(async () => { await wakeSnoozedAction(); })}
            waking={isWaking}
          />
        )}
      </div>

      <div className="river-drift-controls">
        {view.afloat.length > 0 ? (
          <div className="river-drift-on-group">
            <button
              type="button"
              className="river-drift-on"
              onClick={driftOn}
              disabled={busy || !canDriftOn}
              aria-describedby="river-drift-on-hint"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="river-drift-on-mark">
                <path d="M2 9c3-3 6 3 10 0s7 3 10 0M2 15c3-3 6 3 10 0s7 3 10 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {phase === "leaving" ? "Drifting on…" : "Let them drift on"}
            </button>
            <p id="river-drift-on-hint" className="river-drift-hint">
              {canDriftOn
                ? "They'll come back another day. Nothing is marked or lost."
                : "That's everything within reach for now."}
              {view.snoozed > 0 && view.nextReturn ? ` ${view.snoozed} resting upstream, back ${formatWhen(view.nextReturn, true)}.` : null}
            </p>
          </div>
        ) : null}
        <TimeBudgetPicker selectedMinutes={selectedMinutes} onSelect={selectTimeBudget} />
      </div>

      <div
        id="river-bank-lifted"
        ref={bankRef}
        tabIndex={-1}
        className="river-bank-lifted-region"
        aria-label={lifted ? `On the bank: ${lifted.title}` : "On the bank"}
      >
        {lifted ? (
          <LiftedItem item={lifted} onDrift={() => driftOne(lifted.id)} onClose={() => setLiftedId(null)} busy={busy} />
        ) : view.afloat.length > 0 ? (
          <p className="river-bank-hint">Choose one as it passes to bring it to the bank.</p>
        ) : null}
      </div>

      <RiverBankLists bank={bank} />

      <p className="river-sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}

function EmptyRiver({ view, selectedMinutes, onAnyTime, onWake, waking }: {
  view: DriftView;
  selectedMinutes: number | null;
  onAnyTime: () => void;
  onWake: () => void;
  waking: boolean;
}) {
  let content;
  if (view.snoozed > 0) {
    content = (
      <>
        <p className="garden-empty-title">Everything is resting upstream.</p>
        <p>
          {view.snoozed === 1 ? "One piece" : `${view.snoozed} pieces`} will drift back {formatWhen(view.nextReturn!, true)}.
        </p>
        <button type="button" className="river-button" onClick={onWake} disabled={waking}>
          {waking ? "Bringing back…" : "Bring them back now"}
        </button>
      </>
    );
  } else if (selectedMinutes !== null) {
    content = (
      <>
        <p className="garden-empty-title">Nothing that short is passing.</p>
        <p>Pieces without a reading time only drift by for any time.</p>
        <button type="button" className="river-button" onClick={onAnyTime}>Show any length</button>
      </>
    );
  } else {
    content = (
      <>
        <p className="garden-empty-title">The water is clear.</p>
        <p>Add something you might like to read, and it will drift by in its own time.</p>
        <Link href={readingRiverPath("/add")} className="river-button river-button-primary">Add to stream</Link>
      </>
    );
  }
  return <div className="garden-empty">{content}</div>;
}

