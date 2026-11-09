"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { ForestArticle } from "@/lib/reading-river/forest";

/**
 * A finished piece, found by walking up to its golden tree. It wears the same
 * paper label as the boats on the river: tap it to lift the sheet, where you
 * can read it again.
 */
type TreeMemoryProps = {
  article: ForestArticle | null;
  /** Uproot the tree: the finished piece is removed for good. */
  onUproot?: (article: ForestArticle) => void;
};

export const TreeMemory = forwardRef<HTMLElement, TreeMemoryProps>(function TreeMemory({ article, onUproot }, ref) {
  if (!article) return null;
  // Keyed so that walking to another tree always starts with its label closed.
  return <TreeLabel key={article.id} ref={ref} article={article} onUproot={onUproot} />;
});

const TreeLabel = forwardRef<HTMLElement, { article: ForestArticle; onUproot?: (article: ForestArticle) => void }>(
  function TreeLabel({ article, onUproot }, ref) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  // As on the river, Escape or a click elsewhere puts the sheet away.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setConfirming(false);
      requestAnimationFrame(() => cardRef.current?.focus());
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Element | null;
      if (target?.closest && !target.closest(".glade-tree-memory")) { setOpen(false); setConfirming(false); }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const finished = new Date(article.readAt).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
  const meta = (
    <>
      {article.siteName ? <span>{article.siteName}</span> : null}
      {article.siteName ? <span aria-hidden="true">·</span> : null}
      <span>Finished <time dateTime={article.readAt}>{finished}</time></span>
    </>
  );

  return (
    <aside ref={ref} data-article-id={article.id} data-open={open ? (confirming ? "confirming" : "true") : undefined}
      className={["glade-tree-memory", open ? "glade-tree-memory-open" : null].filter(Boolean).join(" ")}
      aria-label="Finished article" aria-live="polite">
      {open ? (
        <div className="glade-card glade-sheet" role="group" aria-label={`Finished: ${article.title}`}>
          <h2 className="glade-card-title glade-sheet-title">{article.title}</h2>
          <p className="glade-card-meta glade-sheet-meta">{meta}</p>
          {confirming ? (
            <div className="glade-sheet-confirm" role="alertdialog" aria-label="Uproot this tree?">
              <p>Are you sure? The tree will be uprooted, and this piece will leave your read history for good.</p>
              <div className="glade-sheet-quiet-row">
                <ConfirmButton onClick={() => onUproot?.(article)}>Uproot it</ConfirmButton>
                <button type="button" className="glade-sheet-quiet" onClick={() => setConfirming(false)}>Keep it</button>
              </div>
            </div>
          ) : (
            <>
              {article.sourceUrl ? (
                <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="glade-sheet-primary">
                  Re-read
                </a>
              ) : (
                <p className="glade-sheet-message">No link was saved for this piece.</p>
              )}
              {onUproot ? (
                <div className="glade-sheet-quiet-row">
                  <button type="button" className="glade-sheet-quiet glade-sheet-remove" onClick={() => setConfirming(true)}>
                    Uproot
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <button ref={cardRef} type="button" className="glade-card glade-tree-card" aria-expanded={false}
          title={article.title} onClick={() => setOpen(true)}>
          <span className="glade-card-title">{article.title}</span>
          <span className="glade-card-meta">{meta}</span>
        </button>
      )}
    </aside>
  );
});

/** Focuses itself on arrival, so "Are you sure?" is answered from the keyboard too. */
function ConfirmButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return <button ref={ref} type="button" className="glade-sheet-quiet glade-sheet-danger" onClick={onClick}>{children}</button>;
}
