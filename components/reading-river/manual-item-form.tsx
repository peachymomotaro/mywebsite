"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitManualReadingItem } from "@/app/reading-river/actions/reading-items";
import { initialIntakeFormState } from "@/lib/reading-river/intake-form-state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="intake-submit-button">
      {pending ? "Saving item..." : "Save manual item"}
    </button>
  );
}

export function ManualItemForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(submitManualReadingItem, initialIntakeFormState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status, state.submittedAt]);

  return (
    <section
      id="manual-item"
      className={state.status === "success" ? "editorial-panel intake-panel intake-panel-success" : "editorial-panel intake-panel"}
    >
      <div className="space-y-3">
        <p className="river-section-label">Manual item</p>
        <h3 className="text-[1.9rem] font-semibold tracking-tight">Write it down</h3>
        <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          Useful for book notes, ideas, printouts, or anything that matters even without a clean
          link.
        </p>
      </div>

      {state.status !== "idle" ? (
        <div
          aria-live="polite"
          className={
            state.status === "success"
              ? "intake-feedback intake-feedback-success"
              : "intake-feedback intake-feedback-error"
          }
        >
          <p className="intake-feedback-message">{state.message}</p>
          {state.savedTitle ? <p className="intake-feedback-title">{state.savedTitle}</p> : null}
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="editorial-form">
        <label className="grid gap-2 text-sm">
          <span>Title</span>
          <input
            name="title"
            type="text"
            required
            placeholder="What do you want to read?"
            className="intake-input"
          />
        </label>
        <div className="grid gap-8 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>Estimated minutes</span>
            <input
              name="estimatedMinutes"
              type="number"
              min="1"
              required
              placeholder="15"
              className="intake-input"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Priority</span>
            <input
              name="priorityScore"
              type="number"
              min="0"
              max="10"
              defaultValue="5"
              className="intake-input"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          <span>Tags</span>
          <input
            name="tagNames"
            type="text"
            placeholder="ideas, book, work"
            className="intake-input"
          />
        </label>
        <div className="intake-submit-row">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
