"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { quickAddUrl } from "@/app/reading-river/actions/ingest-url";
import { QUICK_ADD_IDLE } from "@/lib/reading-river/quick-add-state";
import { readingRiverPath } from "@/lib/reading-river/routes";

/**
 * A small dropdown for adding a link from the glade. Paste it in and we
 * fetch the title and reading time; only if the page won't say how long it
 * is do we ask.
 */
export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(quickAddUrl, QUICK_ADD_IDLE);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // A saved piece joins the stream; refresh so it can drift by.
  useEffect(() => {
    if (state.status === "saved") {
      formRef.current?.reset();
      router.refresh();
    }
    if (state.status === "needsMinutes") requestAnimationFrame(() => minutesRef.current?.focus());
  }, [state, router]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const askingMinutes = state.status === "needsMinutes";
  const url = state.status === "needsMinutes" || state.status === "error" ? state.url : "";

  return (
    <div ref={wrapRef} className="glade-add" data-open={open ? "" : undefined}>
      <button ref={buttonRef} type="button" className="glade-add-toggle" aria-expanded={open}
        aria-controls={`${id}-panel`} title="Add to stream" onClick={() => setOpen((current) => !current)}>
        <span aria-hidden="true">+</span>
        <span className="river-sr-only">Add to stream</span>
      </button>
      <div id={`${id}-panel`} className="glade-add-panel" hidden={!open}>
        <form ref={formRef} action={action} className="glade-add-form" key={state.status === "saved" ? state.submittedAt : "form"}>
          <label htmlFor={`${id}-url`} className="glade-add-label">A link to read</label>
          <div className="glade-add-row">
            <input ref={inputRef} id={`${id}-url`} name="url" type="text" inputMode="url" required spellCheck={false} autoCapitalize="off"
              placeholder="https://…" defaultValue={url} autoComplete="off" className="glade-add-input" />
            {!askingMinutes ? (
              <button type="submit" className="glade-add-submit" disabled={pending}>
                {pending ? "Reading…" : "Add"}
              </button>
            ) : null}
          </div>
          {askingMinutes ? (
            <div className="glade-add-more">
              <p className="glade-add-message">{state.message} How long will it take?</p>
              <input type="hidden" name="title" value={state.title ?? ""} />
              {state.title ? <p className="glade-add-title">{state.title}</p> : null}
              <div className="glade-add-row">
                <label htmlFor={`${id}-minutes`} className="river-sr-only">Minutes to read</label>
                <input ref={minutesRef} id={`${id}-minutes`} name="estimatedMinutes" type="number" min={1} max={600}
                  inputMode="numeric" required placeholder="10" className="glade-add-input glade-add-minutes" />
                <span className="glade-add-unit">min</span>
                <button type="submit" className="glade-add-submit" disabled={pending}>
                  {pending ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          ) : null}
          <p className="glade-add-status" role="status" aria-live="polite">
            {state.status === "saved"
              ? `Added “${state.title}” · ${state.minutes} min. It will drift by soon.`
              : state.status === "error" ? state.message : pending ? "Fetching the title and reading time…" : ""}
          </p>
          <Link href={readingRiverPath("/add")} className="glade-add-elsewhere">More ways to add</Link>
        </form>
      </div>
    </div>
  );
}
