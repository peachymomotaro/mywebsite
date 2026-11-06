"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { noteDriftSeenAction, wakeSnoozedAction } from "@/app/reading-river/actions/drift";
import { deleteReadingItem, markAsRead } from "@/app/reading-river/actions/reading-items";
import type { GladeControls } from "@/components/reading-river/glade-engine";
import { GladeScene } from "@/components/reading-river/glade-scene";
import { gladeFontVariables } from "@/components/reading-river/glade-fonts";
import { GladeSheet, type SheetEdit, type SheetItem } from "@/components/reading-river/glade-sheet";
import { GLADE_LEAVE_MS, GLADE_SAIL_MS } from "@/components/reading-river/glade-timing";
import { QuickAdd } from "@/components/reading-river/quick-add";
import { useGladeSound } from "@/components/reading-river/glade-sound";
import type { EddyArticle } from "@/lib/reading-river/eddies";
import { EDDY_CAPACITY } from "@/lib/reading-river/eddy-state";
import type { DriftView, DriftViews, RiverBank, RiverItem } from "@/lib/reading-river/drift-store";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { getTimeBudgetKey, parseTimeBudgetSearchParam } from "@/lib/reading-river/time-budgets";

/** How long a piece must stay in view, in a visible tab, to count as seen. */
const SEEN_AFTER_MS = 4000;
/** Without the 3D glade, this many pieces sit down the middle of the page. */
const FLAT_COUNT = 3;
/** How long a piece pushed out of the eddies is shown floating away. */
const DRIFT_OUT_MS = 28_000;


export function formatWhen(iso: string, future = false) {
  const date = new Date(iso);
  const days = Math.round(Math.abs(date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return future ? "later today" : "today";
  if (days === 1) return future ? "tomorrow" : "yesterday";
  return `on ${date.toLocaleDateString(undefined, { weekday: "long" })}`;
}

/** Tell the server a piece was opened; it then turns in the eddies. */
function noteOpened(id: string) {
  try {
    return fetch(readingRiverPath("/api/drift/opened"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    });
  } catch {
    return Promise.resolve(undefined);
  }
}

type RiverDriftProps = {
  initialMinutes: number | null;
  views: DriftViews;
  bank: RiverBank;
  /** The eddy pool: what you are reading, newest first, five at most. */
  eddies: EddyArticle[];
};

export function RiverDrift({ initialMinutes, views: serverViews, eddies: serverEddies }: RiverDriftProps) {
  const router = useRouter();
  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes);
  const [views, setViews] = useState(serverViews);
  const [pool, setPool] = useState(serverEddies);
  /** Pieces leaving the eddies: pushed out by a newcomer, or removed for good. */
  const [driftingOut, setDriftingOut] = useState<(EddyArticle & { removed?: boolean })[]>([]);
  /** Finished pieces, sailing out of the eddies and away to sea. */
  const [sailing, setSailing] = useState<EddyArticle[]>([]);
  /** Pieces removed from the river, floating away downstream. */
  const [leaving, setLeaving] = useState<RiverItem[]>([]);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [animate, setAnimate] = useState(false);
  const [scene, setScene] = useState<"loading" | "3d" | "flat">("loading");
  const [inView, setInView] = useState<string[]>([]);
  const [isWaking, startWaking] = useTransition();
  const seenRef = useRef(new Set<string>());
  const seenTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const seqRef = useRef({ gen: "", next: 0, seq: new Map<string, number>() });
  const bankRef = useRef<HTMLDivElement>(null);
  const floatsRef = useRef<HTMLUListElement>(null);
  const poolRef = useRef<HTMLUListElement>(null);
  const layoutRef = useRef<HTMLElement>(null);
  const sound = useGladeSound();
  const controlsRef = useRef<Pick<GladeControls, "turn" | "face" | "walkToNext"> | null>(null);

  const busy = false;
  const key = getTimeBudgetKey(selectedMinutes);
  const view: DriftView = views[key];
  const onSceneReady = useCallback((ready: boolean) => setScene(ready ? "3d" : "flat"), []);
  const onVisible = useCallback((ids: string[]) => setInView(ids), []);

  // Each piece keeps its place in the stream while the page is open, even as
  // others are opened or new ones join upstream.
  if (seqRef.current.gen !== key) seqRef.current = { gen: key, next: 0, seq: new Map() };
  for (const item of view.afloat) {
    if (!seqRef.current.seq.has(item.id)) seqRef.current.seq.set(item.id, seqRef.current.next++);
  }

  const visibleIds = scene === "flat" ? view.afloat.slice(0, FLAT_COUNT).map((item) => item.id) : inView;
  const visibleKey = visibleIds.slice().sort().join();

  // The glade only moves for readers who haven't asked for less motion.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  // Escape or a click elsewhere puts a lifted piece back in the water.
  useEffect(() => {
    if (!liftedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const id = liftedId;
      setLiftedId(null);
      requestAnimationFrame(() => layoutRef.current
        ?.querySelector<HTMLButtonElement>(`.glade-float[data-id="${id}"] button.glade-card`)?.focus());
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      if (!target.closest(".glade-float-lifted")) setLiftedId(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [liftedId]);

  useEffect(() => setViews(serverViews), [serverViews]);
  useEffect(() => setPool(serverEddies), [serverEddies]);

  // A piece pushed out of the eddies is shown floating away for a while.
  useEffect(() => {
    if (driftingOut.length === 0) return;
    const timer = setTimeout(() => setDriftingOut((current) => current.slice(1)), DRIFT_OUT_MS);
    return () => clearTimeout(timer);
  }, [driftingOut]);

  useEffect(() => {
    if (sailing.length === 0) return;
    const timer = setTimeout(() => setSailing((current) => current.slice(1)), GLADE_SAIL_MS);
    return () => clearTimeout(timer);
  }, [sailing]);

  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = setTimeout(() => setLeaving((current) => current.slice(1)), GLADE_LEAVE_MS + 300);
    return () => clearTimeout(timer);
  }, [leaving]);

  const withoutItem = (id: string) => (current: DriftViews) => Object.fromEntries(Object.entries(current).map(([budget, budgetView]) => [
    budget,
    { ...budgetView, afloat: budgetView.afloat.filter((entry) => entry.id !== id) },
  ])) as DriftViews;

  /** A changed title or reading time shows at once; the server follows. */
  function edited(id: string, edit: SheetEdit) {
    const patch = <T extends { id: string }>(entry: T) => (entry.id === id ? { ...entry, ...edit } : entry);
    setViews((current) => Object.fromEntries(Object.entries(current).map(([budget, budgetView]) => [
      budget, { ...budgetView, afloat: budgetView.afloat.map(patch) },
    ])) as DriftViews);
    setPool((current) => current.map(patch));
  }

  /** Removed for good: its raft floats away downstream, or out of the eddies. */
  function remove(item: SheetItem) {
    setLiftedId(null);
    const fromPool = pool.find((entry) => entry.id === item.id);
    if (fromPool) {
      setPool((current) => current.filter((entry) => entry.id !== item.id));
      setDriftingOut((current) => [...current.filter((entry) => entry.id !== item.id), { ...fromPool, removed: true }]);
    } else {
      const afloat = view.afloat.find((entry) => entry.id === item.id);
      if (afloat) setLeaving((current) => [...current.filter((entry) => entry.id !== item.id), afloat]);
      setViews(withoutItem(item.id));
    }
    setAnnouncement(`${item.title} floats away.`);
    void deleteReadingItem({ id: item.id }).catch(() => router.refresh());
  }

  /**
   * Finished: the raft becomes a little ship, ready for the sea, and sails out
   * of the eddies and away down the river.
   */
  function finish(item: SheetItem) {
    setLiftedId(null);
    const fromPool = pool.find((entry) => entry.id === item.id);
    if (fromPool) {
      setPool((current) => current.filter((entry) => entry.id !== item.id));
      setSailing((current) => [...current.filter((entry) => entry.id !== item.id), fromPool]);
    } else {
      const afloat = view.afloat.find((entry) => entry.id === item.id);
      if (afloat) setLeaving((current) => [...current.filter((entry) => entry.id !== item.id), afloat]);
      setViews(withoutItem(item.id));
    }
    setAnnouncement(`Finished ${item.title}. It sets sail for the sea.`);
    void markAsRead({ id: item.id }).catch(() => router.refresh());
  }
  useEffect(() => setSelectedMinutes(initialMinutes), [initialMinutes]);

  useEffect(() => {
    function syncFromAddressBar() {
      const params = new URLSearchParams(window.location.search);
      setSelectedMinutes(parseTimeBudgetSearchParam(params.get("time") ?? undefined));
    }
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

  // Count meaningful exposure only: a piece counts as seen once it has stayed
  // in view for a few seconds in a visible tab. Each counts once a day.
  useEffect(() => {
    const timers = seenTimers.current;
    const ids = visibleKey ? visibleKey.split(",") : [];
    function arm() {
      for (const [id, timer] of timers) {
        if (!ids.includes(id) || document.visibilityState !== "visible") {
          clearTimeout(timer);
          timers.delete(id);
        }
      }
      if (document.visibilityState !== "visible") return;
      for (const id of ids) {
        const marker = `${key}:${id}`;
        if (seenRef.current.has(marker) || timers.has(id)) continue;
        timers.set(id, setTimeout(() => {
          timers.delete(id);
          seenRef.current.add(marker);
          void noteDriftSeenAction(key, [id]).catch(() => undefined);
        }, SEEN_AFTER_MS));
      }
    }
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => document.removeEventListener("visibilitychange", arm);
  }, [key, visibleKey]);

  useEffect(() => () => {
    for (const timer of seenTimers.current.values()) clearTimeout(timer);
  }, []);

  function selectTimeBudget(minutes: number | null) {
    if (minutes === selectedMinutes || busy) return;
    const url = new URL(window.location.href);
    if (minutes === null) url.searchParams.delete("time");
    else url.searchParams.set("time", String(minutes));
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    setSelectedMinutes(minutes);
    setLiftedId(null);
  }

  function lift(id: string) {
    const next = liftedId === id ? null : id;
    setLiftedId(next);
    if (next) requestAnimationFrame(() => bankRef.current?.focus({ preventScroll: true }));
  }

  /**
   * Opening a piece carries it into the eddies straight away. If the pool was
   * full, the one there longest drifts out into the river; the server agrees.
   */
  function opened(item: SheetItem) {
    if (!pool.some((entry) => entry.id === item.id)) {
      const entry: EddyArticle = { id: item.id, title: item.title, sourceUrl: item.sourceUrl, siteName: item.siteName, estimatedMinutes: item.estimatedMinutes };
      const next = [entry, ...pool];
      const pushedOut = next.length > EDDY_CAPACITY ? next[next.length - 1] : null;
      setPool(next.slice(0, EDDY_CAPACITY));
      if (pushedOut) setDriftingOut((current) => [...current, pushedOut]);
      setAnnouncement(pushedOut
        ? `${item.title} is in the eddies. ${pushedOut.title} drifted back into the river.`
        : `${item.title} is in the eddies.`);
    }
    setViews(withoutItem(item.id));
    if (liftedId === item.id) setLiftedId(null);
    void noteOpened(item.id)?.then(() => router.refresh(), () => undefined);
  }

  /** Walk on to the next piece afloat, round them all in turn. */
  function walkToNext() {
    const id = controlsRef.current?.walkToNext() ?? null;
    const item = view.afloat.find((entry) => entry.id === id);
    setAnnouncement(item ? `Walking over to ${item.title}.` : "Nothing is passing just now.");
  }

  const flatIds = new Set(view.afloat.slice(0, FLAT_COUNT).map((item) => item.id));

  return (
    <section ref={layoutRef} className={`glade-home-layout ${gladeFontVariables}`} aria-labelledby="river-drift-heading"
      data-scene={scene}>
      <div className="glade-stage">
        <GladeScene animate={animate} floatsRef={floatsRef} poolRef={poolRef}
          onReady={onSceneReady} onVisible={onVisible} onSurroundings={sound.hear} controlsRef={controlsRef} />

        <ul ref={poolRef} className="glade-afloat glade-pool" aria-label="In the eddies">
          {[
            ...pool.filter((entry) => !driftingOut.some((out) => out.id === entry.id) && !sailing.some((out) => out.id === entry.id)),
            ...driftingOut,
            ...sailing,
          ].map((item) => {
            const drift = driftingOut.find((entry) => entry.id === item.id);
            const sails = sailing.some((entry) => entry.id === item.id);
            const moving = Boolean(drift) || sails;
            const isLifted = !moving && liftedId === item.id;
            const state = sails ? "sailing" : drift ? "drifting" : isLifted ? "lifted" : "";
            return (
              <li key={item.id} data-id={item.id} data-state={state}
                className={["glade-float", "glade-float-pool", isLifted ? "glade-float-lifted" : null].filter(Boolean).join(" ")}>
                {isLifted ? (
                  <GladeSheet ref={bankRef} item={item} place="eddies" onStart={opened} onFinish={finish}
                    onRemove={remove} onEdited={edited} />
                ) : (
                  <button type="button" className="glade-card" aria-pressed={false} disabled={moving}
                    aria-controls="river-bank-lifted" title={item.title} onClick={() => lift(item.id)}>
                    <span className="glade-card-title">{item.title}</span>
                    <span className="glade-card-meta">
                      {sails ? "Finished · sailing out to sea" : drift ? (drift.removed ? "Floating away" : "Drifting back into the river") : "In the eddies"}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {view.afloat.length > 0 || leaving.length > 0 ? (
          <ul ref={floatsRef} className="glade-afloat" aria-label="Drifting by" aria-busy={busy} data-gen={key}>
            {[...view.afloat.filter((entry) => !leaving.some((out) => out.id === entry.id)), ...leaving].map((item, index) => {
              const gone = leaving.some((entry) => entry.id === item.id);
              const isLifted = !gone && liftedId === item.id;
              const state = gone ? "leaving" : isLifted ? "lifted" : "";
              const meta = [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ");
              return (
                <li
                  key={item.id}
                  data-id={item.id}
                  data-seq={seqRef.current.seq.get(item.id)}
                  data-slot={flatIds.has(item.id) ? index : undefined}
                  data-state={state}
                  className={["glade-float", isLifted ? "glade-float-lifted" : null].filter(Boolean).join(" ")}
                >
                  {isLifted ? (
                    <GladeSheet ref={bankRef} item={item} place="river" onStart={opened} onFinish={finish}
                      onRemove={remove} onEdited={edited} />
                  ) : (
                    <button
                      type="button"
                      className="glade-card"
                      // Each label hangs at a slight angle of its own.
                      style={{ "--tilt": `${(((seqRef.current.seq.get(item.id) ?? index) * 7) % 5 - 2) * 0.9}deg` } as React.CSSProperties}
                      aria-pressed={false}
                      aria-controls="river-bank-lifted"
                      title={item.title}
                      onClick={() => lift(item.id)}
                      disabled={busy || gone}
                    >
                      <span className="glade-card-title">{item.title}</span>
                      <span className="glade-card-meta">{gone ? "Floating away" : meta}</span>
                    </button>
                  )}
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

      <div className="glade-top">
        <h1 className="glade-title">Pick your next read</h1>
        <h2 id="river-drift-heading" className="river-sr-only">Drifting by</h2>
        <div className="glade-menus" role="group" aria-label="River tools">
          {sound.supported ? (
            <button type="button" className="glade-sound-toggle" aria-pressed={sound.on} onClick={sound.toggle}
              title="Sound">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z" fill="currentColor" />
                {sound.on ? (
                  <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <path d="m13.2 7.6 4.6 4.8m0-4.8-4.6 4.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                )}
              </svg>
              <span className="river-sr-only">Sound</span>
            </button>
          ) : null}
          <QuickAdd />
        </div>
      </div>

      {scene === "3d" ? (
        <div className="glade-foot" role="group" aria-label="Look around">
          <button type="button" className="glade-turn" onClick={() => controlsRef.current?.turn(-Math.PI / 4)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5 3 10l5 5M3.5 10H17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="river-sr-only">Look left</span>
          </button>
          <div className="glade-face-wrap">
            <span className="glade-hint" aria-hidden="true">Tap the bank or use the arrow keys to walk · drag to look around</span>
            <button type="button" className="glade-face" onClick={walkToNext}>
              Walk to the next piece
            </button>
          </div>
          <button type="button" className="glade-turn" onClick={() => controlsRef.current?.turn(Math.PI / 4)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 5 5 5-5 5M16.5 10H3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="river-sr-only">Look right</span>
          </button>
        </div>
      ) : null}

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
        <p className="glade-empty-title">Everything is resting upstream.</p>
        <p>{view.snoozed === 1 ? "One piece" : `${view.snoozed} pieces`} will drift back {formatWhen(view.nextReturn!, true)}.</p>
        <button type="button" className="river-button" onClick={onWake} disabled={waking}>
          {waking ? "Bringing back…" : "Bring them back now"}
        </button>
      </>
    );
  } else if (selectedMinutes !== null) {
    content = (
      <>
        <p className="glade-empty-title">Nothing that short is passing.</p>
        <p>Pieces without a reading time only drift by for any time.</p>
        <button type="button" className="river-button" onClick={onAnyTime}>Show any length</button>
      </>
    );
  } else {
    content = (
      <>
        <p className="glade-empty-title">The water is clear.</p>
        <p>Add something you might like to read, and it will drift by in its own time.</p>
        <Link href={readingRiverPath("/add")} className="river-button river-button-primary">Add to stream</Link>
      </>
    );
  }
  return <div className="glade-empty">{content}</div>;
}
