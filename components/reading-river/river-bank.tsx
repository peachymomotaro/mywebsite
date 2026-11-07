"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { putBackInRiverAction } from "@/app/reading-river/actions/drift";
import { changeEddyArticle } from "@/app/reading-river/actions/eddies";
import { deleteReadingItem, markAsRead } from "@/app/reading-river/actions/reading-items";
import { HomeCardTags } from "@/components/reading-river/home-card-tags";
import { HomeRemoveAction } from "@/components/reading-river/home-remove-action";
import type { BankItem, RiverBank, RiverItem } from "@/lib/reading-river/drift-store";
import { readingRiverItemEditPath } from "@/lib/reading-river/routes";

type Opened = (item: RiverItem | BankItem) => void;

function metaFor(item: RiverItem) {
  return [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ");
}

/** Articles open in a new tab so the river stays where it was. */
function ArticleLink({ item, onOpened, className, children }: {
  item: RiverItem | BankItem;
  onOpened: Opened;
  className?: string;
  children: React.ReactNode;
}) {
  if (!item.sourceUrl) return <>{children}</>;
  return (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => onOpened(item)}
      onAuxClick={(event) => { if (event.button === 1) onOpened(item); }}
    >
      {children}
    </a>
  );
}

type LiftedItemProps = {
  item: RiverItem;
  onClose: () => void;
  onOpened: Opened;
  busy: boolean;
  /** The floating card already shows the title, so the actions can leave it out. */
  showTitle?: boolean;
};

/**
 * A piece lifted from the stream. There is no "not now": leaving it be is
 * enough, and it drifts on by itself. Starting to read carries it into the eddies.
 */
export function LiftedItem({ item, onClose, onOpened, busy, showTitle = true }: LiftedItemProps) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || busy;

  return (
    <article className="river-bank-lifted" aria-label={showTitle ? undefined : item.title}
      aria-labelledby={showTitle ? `lifted-${item.id}` : undefined}>
      {showTitle ? (
        <>
          <h3 id={`lifted-${item.id}`} className="river-bank-lifted-title">
            <ArticleLink item={item} onOpened={onOpened}>{item.title}</ArticleLink>
          </h3>
          <p className="river-bank-meta">
            {metaFor(item)}
          </p>
        </>
      ) : null}
      <HomeCardTags tags={item.tags} />

      <div className="river-bank-primary-row">
        {item.sourceUrl ? (
          <ArticleLink item={item} onOpened={onOpened} className="river-button river-button-primary">
            Start reading
          </ArticleLink>
        ) : null}
        <button type="button" className="river-button" disabled={disabled}
          onClick={() => startTransition(async () => { await markAsRead({ id: item.id }); })}>
          Mark as read
        </button>
      </div>
      <div className="river-bank-quiet-row">
        <Link href={readingRiverItemEditPath(item.id)} className="river-eddy-text-action" aria-label={`Edit ${item.title}`}>
          Edit
        </Link>
        <HomeRemoveAction removeAction={() => deleteReadingItem({ id: item.id }).then(() => undefined)} />
        <button type="button" className="river-eddy-text-action river-bank-close" onClick={onClose}>
          Back to the water
        </button>
      </div>
    </article>
  );
}

function relativeDay(iso: string) {
  const date = new Date(iso);
  const days = Math.round(
    (new Date(new Date().toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function BankRow({ item, kind, onOpened }: { item: BankItem; kind: "reading" | "passed"; onOpened: Opened }) {
  const [pending, startTransition] = useTransition();
  const when = kind === "reading" ? item.openedAt : item.surfacedAt;

  return (
    <li className="river-bank-row">
      <h4 className="river-bank-row-title">
        <ArticleLink item={item} onOpened={onOpened}>{item.title}</ArticleLink>
      </h4>
      <p className="river-bank-meta">
        {[metaFor(item), when ? `${kind === "reading" ? "opened" : "passed"} ${relativeDay(when)}` : null].filter(Boolean).join(" · ")}
      </p>
      <div className="river-bank-row-actions">
        <button type="button" className="river-eddy-text-action" disabled={pending}
          onClick={() => startTransition(async () => { await markAsRead({ id: item.id }); })}>
          Mark as read
        </button>
        {kind === "reading" ? (
          <button type="button" className="river-eddy-text-action" disabled={pending}
            onClick={() => startTransition(async () => { await putBackInRiverAction(item.id); })}>
            Put back in the river
          </button>
        ) : null}
        <Link href={readingRiverItemEditPath(item.id)} className="river-eddy-text-action" aria-label={`Edit ${item.title}`}>
          Edit
        </Link>
      </div>
    </li>
  );
}

/**
 * A piece turning in the eddy pool, lifted to look at: carry on reading it,
 * mark it read, or let it drift back out into the river.
 */
export function PoolItemActions({ item, onOpened, onClose, onLetGo }: {
  item: BankItem | (RiverItem & { openedAt?: string | null });
  onOpened: Opened;
  onClose: () => void;
  onLetGo: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <article className="river-bank-lifted" aria-label={item.title}>
      <p className="river-bank-meta">In the eddies</p>
      <div className="river-bank-primary-row">
        {item.sourceUrl ? (
          <ArticleLink item={item} onOpened={onOpened} className="river-button river-button-primary">
            Carry on reading
          </ArticleLink>
        ) : null}
        <button type="button" className="river-button" disabled={pending}
          onClick={() => startTransition(async () => { await markAsRead({ id: item.id }); })}>
          Mark as read
        </button>
      </div>
      <div className="river-bank-quiet-row">
        <button type="button" className="river-eddy-text-action" disabled={pending}
          onClick={() => {
            onLetGo(item.id);
            startTransition(async () => { await changeEddyArticle(item.id, "remove", { status: "idle" }, new FormData()); });
          }}>
          Let it drift back into the river
        </button>
        <Link href={readingRiverItemEditPath(item.id)} className="river-eddy-text-action" aria-label={`Edit ${item.title}`}>
          Edit
        </Link>
        <button type="button" className="river-eddy-text-action river-bank-close" onClick={onClose}>
          Back to the pool
        </button>
      </div>
    </article>
  );
}

type BankTab = "eddies" | "reading" | "passed";

/**
 * The eddies, with the week's passers a tab away. Pieces opened before the
 * eddies became the reading pool, and not in it, are listed as Still reading.
 */
export function RiverBankPanel({ bank, onOpened, eddies, eddyCount, eddyIds }: {
  bank: RiverBank;
  onOpened: Opened;
  eddies: React.ReactNode;
  eddyCount: number;
  eddyIds: string[];
}) {
  const [tab, setTab] = useState<BankTab>("eddies");
  const stillReading = bank.stillReading.filter((item) => !eddyIds.includes(item.id));
  const tabs: { id: BankTab; label: string; count: string }[] = [
    { id: "eddies", label: "In the eddies", count: `${eddyCount} of 5` },
    ...(stillReading.length > 0 ? [{ id: "reading" as const, label: "Still reading", count: String(stillReading.length) }] : []),
    { id: "passed", label: "Drifted past", count: String(bank.recentlyPassed.length) },
  ];
  const current = tabs.some((entry) => entry.id === tab) ? tab : "eddies";
  const items = current === "reading" ? stillReading : bank.recentlyPassed;

  return (
    <section className="river-bank-section" aria-labelledby="river-bank-tabs">
      <div className="river-bank-tabs" role="tablist" id="river-bank-tabs" aria-label="The eddies and the bank">
        {tabs.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-selected={current === entry.id} aria-controls="river-bank-list"
            className="river-bank-tab" onClick={() => setTab(entry.id)}>
            {entry.label} <span className="river-bank-count">{entry.count}</span>
          </button>
        ))}
      </div>
      <div id="river-bank-list" role="tabpanel" className="river-bank-scroll">
        {current === "eddies" ? eddies : items.length > 0 ? (
          <ul className="river-bank-list">
            {items.map((item) => <BankRow key={item.id} item={item} kind={current === "reading" ? "reading" : "passed"} onOpened={onOpened} />)}
          </ul>
        ) : (
          <p className="river-bank-hint">
            Pieces that drifted past this week will be here if you want one back.
          </p>
        )}
      </div>
    </section>
  );
}
