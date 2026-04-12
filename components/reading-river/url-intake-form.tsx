"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitUrlIntake } from "@/app/reading-river/actions/ingest-url";
import { initialIntakeFormState } from "@/lib/reading-river/intake-form-state";

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="intake-submit-button">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function UrlIntakeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(submitUrlIntake, initialIntakeFormState);
  const isReview = state.status === "review";
  const estimatedMinutesRequired = state.reviewMetadata?.estimatedMinutesRequired ?? false;
  const draftValues = state.draftValues ?? {
    url: "",
    title: "",
    notes: "",
    priorityScore: "5",
    estimatedMinutes: "",
    tagNames: "",
  };

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status, state.submittedAt]);

  return (
    <section
      id="paste-url"
      className={state.status === "success" ? "editorial-panel intake-panel intake-panel-success" : "editorial-panel intake-panel"}
    >
      <div className="space-y-3">
        <p className="river-section-label">Article link</p>
        <h3 className="text-[1.9rem] font-semibold tracking-tight">Paste a link</h3>
        <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          Drop in the URL first. We&apos;ll fetch what we can, then you can review it before saving.
        </p>
        <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          Reading River can usually suggest the title and reading time, and you can edit either
          before saving.
        </p>
      </div>

      {state.status !== "idle" ? (
        <div
          aria-live="polite"
          className={
            state.status === "success"
              ? "intake-feedback intake-feedback-success"
              : state.status === "review"
                ? "intake-feedback intake-feedback-review"
              : "intake-feedback intake-feedback-error"
          }
        >
          <p className="intake-feedback-message">{state.message}</p>
          {state.savedTitle ? <p className="intake-feedback-title">{state.savedTitle}</p> : null}
        </div>
      ) : null}

      <form
        key={state.submittedAt ?? 0}
        ref={formRef}
        action={formAction}
        className="editorial-form"
      >
        <label className="grid gap-2 text-sm">
          <span>URL</span>
          <input
            name="url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={draftValues.url}
            placeholder="https://example.com/article"
            className="intake-input"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Title</span>
          <input
            name="title"
            type="text"
            defaultValue={draftValues.title}
            placeholder="Optional title"
            className="intake-input"
          />
        </label>
        {isReview ? (
          <label className="grid gap-2 text-sm">
            <span>Estimated minutes</span>
            <input
              name="estimatedMinutes"
              type="number"
              min="1"
              required={estimatedMinutesRequired}
              autoFocus={estimatedMinutesRequired}
              defaultValue={draftValues.estimatedMinutes}
              placeholder="12"
              className="intake-input"
            />
          </label>
        ) : null}
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="grid gap-2 text-sm">
            <label htmlFor="url-intake-priority-score">Priority</label>
            <input
              id="url-intake-priority-score"
              name="priorityScore"
              type="number"
              min="0"
              max="10"
              defaultValue={draftValues.priorityScore}
              aria-describedby="url-intake-priority-help"
              className="intake-input"
            />
            <p id="url-intake-priority-help" className="intake-helper-text">
              0–10, where 10 is highest priority.
            </p>
          </div>
          <label className="grid gap-2 text-sm">
            <span>Tags</span>
            <input
              name="tagNames"
              type="text"
              defaultValue={draftValues.tagNames}
              placeholder="work, essays"
              className="intake-input"
            />
          </label>
        </div>
        <div className="intake-submit-row">
          <SubmitButton
            idleLabel={isReview ? "Save article" : "Fetch details"}
            pendingLabel={isReview ? "Saving article..." : "Fetching details..."}
          />
        </div>
      </form>
    </section>
  );
}
