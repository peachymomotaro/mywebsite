"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { putBackInRiverAction, renewPriorityAction } from "@/app/reading-river/actions/drift";
import { deleteReadingItem, markAsRead } from "@/app/reading-river/actions/reading-items";
import { EddyArticleActions } from "@/components/reading-river/eddy-article-actions";
import { HomeCardTags } from "@/components/reading-river/home-card-tags";
import { HomeRemoveAction } from "@/components/reading-river/home-remove-action";
import type { BankItem, RiverBank, RiverItem } from "@/lib/reading-river/drift-store";
import { readingRiverItemEditPath, readingRiverPath } from "@/lib/reading-river/routes";

/**
 * Opening a piece lifts it onto the bank ("still reading"), so it is still
 * here tomorrow even after the river has moved on.
 */
function useOpenLink() {
  const router = useRouter();
  return (id: string) => {
    try {
      void fetch(readingRiverPath("/api/drift/opened"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).then(() => router.refresh(), () => undefined);
    } catch {
      // Reading still works if the note can't be sent.
    }
  };
}

function metaFor(item: RiverItem) {
  return [item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ");
}

type LiftedItemProps = {
  item: RiverItem;
  onDrift: () => void;
  onClose: () => void;
  busy: boolean;
};

export function LiftedItem({ item, onDrift, onClose, busy }: LiftedItemProps) {
  const [pending, startTransition] = useTransition();
  const opened = useOpenLink();
  const disabled = pending || busy;

  return (
    <article className="river-bank-lifted" aria-labelledby={`lifted-${item.id}`}>
      <div className="river-bank-lifted-copy">
        <h3 id={`lifted-${item.id}`} className="river-bank-lifted-title">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} onClick={() => opened(item.id)} onAuxClick={() => opened(item.id)}>{item.title}</a>
          ) : item.title}
        </h3>
        <p className="river-bank-meta">
          {metaFor(item)}
          {item.hasPriority ? <span className="garden-float-priority">Priority</span> : null}
        </p>
        <HomeCardTags tags={item.tags} />
      </div>

      <div className="river-bank-lifted-actions">
        <div className="river-bank-primary-row">
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              className="river-button river-button-primary"
              onClick={() => opened(item.id)}
              onAuxClick={() => opened(item.id)}
            >
              Start reading
            </a>
          ) : null}
          <button
            type="button"
            className="river-button"
            disabled={disabled}
            onClick={() => startTransition(async () => { await markAsRead({ id: item.id }); })}
          >
            Mark as read
          </button>
          <button type="button" className="river-button" disabled={disabled} onClick={onDrift}
            title="Let just this one drift on. Nothing about it changes.">
            Not now
          </button>
        </div>
        <div className="river-bank-quiet-row">
          <EddyArticleActions id={item.id} inEddies={item.inEddies} />
          {item.priorityFaded ? (
            <button type="button" className="river-eddy-text-action" disabled={disabled}
              onClick={() => startTransition(async () => { await renewPriorityAction(item.id); })}>
              Renew priority
            </button>
          ) : null}
          <Link href={readingRiverItemEditPath(item.id)} className="river-eddy-text-action" aria-label={`Edit ${item.title}`}>
            Edit
          </Link>
          <HomeRemoveAction removeAction={() => deleteReadingItem({ id: item.id }).then(() => undefined)} />
          <button type="button" className="river-eddy-text-action river-bank-close" onClick={onClose}>
            Back to the water
          </button>
        </div>
      </div>
    </article>
  );
}

function BankRow({ item, kind }: { item: BankItem; kind: "reading" | "passed" }) {
  const [pending, startTransition] = useTransition();
  const opened = useOpenLink();
  const when = kind === "reading" ? item.openedAt : item.surfacedAt;
  const whenText = when ? relativeDay(when) : null;

  return (
    <li className="river-bank-row">
      <div className="river-bank-row-copy">
        <h4 className="river-bank-row-title">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} onClick={() => opened(item.id)} onAuxClick={() => opened(item.id)}>{item.title}</a>
          ) : item.title}
        </h4>
        <p className="river-bank-meta">
          {[metaFor(item), whenText ? `${kind === "reading" ? "opened" : "passed"} ${whenText}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="river-bank-row-actions">
        <button
          type="button"
          className="river-eddy-text-action"
          disabled={pending}
          onClick={() => startTransition(async () => { await markAsRead({ id: item.id }); })}
        >
          Mark as read
        </button>
        {kind === "reading" ? (
          <button
            type="button"
            className="river-eddy-text-action"
            disabled={pending}
            onClick={() => startTransition(async () => { await putBackInRiverAction(item.id); })}
          >
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

function relativeDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

export function RiverBankLists({ bank }: { bank: RiverBank }) {
  if (bank.stillReading.length === 0 && bank.recentlyPassed.length === 0) return null;

  return (
    <div className="river-bank-lists">
      {bank.stillReading.length > 0 ? (
        <section className="river-bank-section" aria-labelledby="river-still-reading">
          <h3 id="river-still-reading" className="river-bank-heading">Still reading</h3>
          <ul className="river-bank-list">
            {bank.stillReading.map((item) => <BankRow key={item.id} item={item} kind="reading" />)}
          </ul>
        </section>
      ) : null}

      {bank.recentlyPassed.length > 0 ? (
        <details className="river-bank-section river-bank-passed">
          <summary className="river-bank-heading">
            Drifted past this week
            <span className="river-bank-count">{bank.recentlyPassed.length}</span>
          </summary>
          <ul className="river-bank-list">
            {bank.recentlyPassed.map((item) => <BankRow key={item.id} item={item} kind="passed" />)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
