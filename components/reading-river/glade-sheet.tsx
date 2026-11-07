"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { updateReadingItem } from "@/app/reading-river/actions/reading-items";

export type SheetItem = {
  id: string;
  title: string;
  sourceUrl: string | null;
  siteName: string | null;
  estimatedMinutes: number | null;
};

export type SheetEdit = { title?: string; estimatedMinutes?: number; sourceUrl?: string | null };

type GladeSheetProps = {
  item: SheetItem;
  /** On the river you start a piece; in the eddies you carry on or finish it. */
  place: "river" | "eddies";
  onStart: (item: SheetItem) => void;
  onFinish: (item: SheetItem) => void;
  onRemove: (item: SheetItem) => void;
  onEdited: (id: string, edit: SheetEdit) => void;
};

const MAX_MINUTES = 600;

/**
 * A piece lifted out of the water: one sheet of the same paper as its label.
 * Tap the title or the reading time to change it. On the river there is only
 * Start reading, which carries it into the eddies; in the eddies you carry on
 * or finish it. Remove lets it float away for good, after asking.
 */
export const GladeSheet = forwardRef<HTMLDivElement, GladeSheetProps>(function GladeSheet(
  { item, place, onStart, onFinish, onRemove, onEdited }, ref,
) {
  const [editing, setEditing] = useState<"title" | "minutes" | "sourceUrl" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const startLabel = place === "eddies" ? "Continue" : "Start reading";
  const canFinish = place === "eddies";

  async function save(edit: SheetEdit) {
    setEditing(null);
    if (edit.title !== undefined && edit.title === item.title) return;
    if (edit.estimatedMinutes !== undefined && edit.estimatedMinutes === item.estimatedMinutes) return;
    if (edit.sourceUrl !== undefined && edit.sourceUrl === item.sourceUrl) return;
    const before = { title: item.title, estimatedMinutes: item.estimatedMinutes ?? undefined, sourceUrl: item.sourceUrl };
    onEdited(item.id, edit);
    setMessage("");
    try {
      await updateReadingItem({
        id: item.id,
        ...edit,
        ...(edit.estimatedMinutes !== undefined
          ? { lengthEstimationMethod: "manual", lengthEstimationConfidence: "high" } : {}),
      });
    } catch {
      onEdited(item.id, edit.title !== undefined ? { title: before.title }
        : edit.sourceUrl !== undefined ? { sourceUrl: before.sourceUrl }
        : { estimatedMinutes: before.estimatedMinutes });
      setMessage("Couldn't save that change. Try again.");
    }
  }

  return (
    <div ref={ref} id="river-bank-lifted" tabIndex={-1} className="glade-card glade-sheet" role="group"
      aria-label={place === "eddies" ? `In the eddies: ${item.title}` : `Lifted from the river: ${item.title}`}>
      <h3 className="glade-card-title glade-sheet-title">
        {editing === "title" ? (
          <TitleField value={item.title} onDone={(title) => (title ? save({ title }) : setEditing(null))}
            onCancel={() => setEditing(null)} />
        ) : (
          <button type="button" className="glade-sheet-editable" onClick={() => setEditing("title")}
            aria-label={`${item.title}. Change the title`}>
            {item.title}
          </button>
        )}
      </h3>
      <p className="glade-card-meta glade-sheet-meta">
        {item.siteName ? <span>{item.siteName}</span> : null}
        {item.siteName ? <span aria-hidden="true">·</span> : null}
        {editing === "minutes" ? (
          <MinutesField value={item.estimatedMinutes}
            onDone={(minutes) => (minutes ? save({ estimatedMinutes: minutes }) : setEditing(null))}
            onCancel={() => setEditing(null)} />
        ) : (
          <button type="button" className="glade-sheet-editable" onClick={() => setEditing("minutes")}
            aria-label={item.estimatedMinutes ? `${item.estimatedMinutes} minutes. Change the reading time` : "Add a reading time"}>
            {item.estimatedMinutes ? `${item.estimatedMinutes} min` : "How long?"}
          </button>
        )}
      </p>

      {confirming ? (
        <div className="glade-sheet-confirm" role="alertdialog" aria-label="Remove this piece?">
          <p>Are you sure? It will float away, and you won&rsquo;t see it again.</p>
          <div className="glade-sheet-actions">
            <ConfirmButton onClick={() => onRemove(item)}>Let it float away</ConfirmButton>
            <button type="button" className="glade-sheet-quiet" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="glade-sheet-actions">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="glade-sheet-button glade-sheet-primary"
              onClick={() => onStart(item)} onAuxClick={(event) => { if (event.button === 1) onStart(item); }}>
              {startLabel}
            </a>
          ) : (
            <button type="button" className="glade-sheet-button glade-sheet-primary"
              onClick={() => setEditing("sourceUrl")}>
              Add article link to {place === "eddies" ? "continue" : "start reading"}
            </button>
          )}
          {canFinish ? (
            <button type="button" className="glade-sheet-button" onClick={() => onFinish(item)}>
              Finished
            </button>
          ) : null}
          <button type="button" className="glade-sheet-quiet glade-sheet-remove" onClick={() => setConfirming(true)}>
            Remove
          </button>
        </div>
      )}
      {editing === "sourceUrl" ? (
        <LinkField onSave={(sourceUrl) => void save({ sourceUrl })} onCancel={() => setEditing(null)} />
      ) : null}
      <p className="glade-sheet-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
});

/** Focuses itself on arrival, so "Are you sure?" is answered from the keyboard too. */
function ConfirmButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <button ref={ref} type="button" className="glade-sheet-button glade-sheet-danger" onClick={onClick}>{children}</button>;
}

/** Enter keeps the change, Escape (or emptying it) leaves the title as it was. */
function TitleField({ value, onDone, onCancel }: { value: string; onDone: (title: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value);
  const done = useRef(false);
  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    if (keep) onDone(draft.trim());
    else onCancel();
  };
  return (
    <textarea className="glade-sheet-field glade-sheet-field-title" aria-label="Title" value={draft} rows={2} maxLength={300}
      autoFocus onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value.replace(/\n/g, " "))}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); finish(true); }
        if (event.key === "Escape") { event.stopPropagation(); event.nativeEvent.stopImmediatePropagation(); finish(false); }
      }}
      onBlur={() => finish(true)} />
  );
}

function MinutesField({ value, onDone, onCancel }: { value: number | null; onDone: (minutes: number | null) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const done = useRef(false);
  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    const minutes = Math.round(Number(draft));
    if (keep && Number.isFinite(minutes) && minutes >= 1 && minutes <= MAX_MINUTES) onDone(minutes);
    else onCancel();
  };
  return (
    <span className="glade-sheet-minutes">
      <input className="glade-sheet-field glade-sheet-field-minutes" aria-label="Minutes to read" type="number"
        inputMode="numeric" min={1} max={MAX_MINUTES} value={draft} autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); finish(true); }
          if (event.key === "Escape") { event.stopPropagation(); event.nativeEvent.stopImmediatePropagation(); finish(false); }
        }}
        onBlur={() => finish(true)} />
      <span aria-hidden="true">min</span>
    </span>
  );
}

/** A real URL is required to open the article. Never guess a missing link. */
function LinkField({ onSave, onCancel }: { onSave: (url: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let parsed: URL;
    try { parsed = new URL(url.trim()); }
    catch { setError("Enter a full article URL."); return; }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setError("Use an http:// or https:// article URL.");
      return;
    }
    setError("");
    onSave(parsed.toString());
  }
  return (
    <form className="glade-sheet-link-editor" onSubmit={submit}>
      <label htmlFor="glade-sheet-source-link" className="river-sr-only">Article link</label>
      <input id="glade-sheet-source-link" className="glade-sheet-field" type="url" required autoFocus
        placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onCancel(); } }} />
      <div className="glade-sheet-actions">
        <button className="glade-sheet-button" type="submit">Save link</button>
        <button className="glade-sheet-quiet" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error ? <p className="glade-sheet-message" role="alert">{error}</p> : null}
    </form>
  );
}
