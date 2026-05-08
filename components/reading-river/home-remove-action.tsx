"use client";

import { useState, useTransition } from "react";

export const READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY =
  "reading-river.skip-remove-confirmation";

type HomeRemoveActionProps = {
  removeAction: () => Promise<void>;
};

function hasSavedRemovePreference() {
  try {
    return window.localStorage.getItem(READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY) === "true";
  } catch {
    return false;
  }
}

function saveRemovePreference() {
  try {
    window.localStorage.setItem(READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY, "true");
  } catch {
    // Ignore storage failures and keep confirmation enabled.
  }
}

export function HomeRemoveAction({ removeAction }: HomeRemoveActionProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [skipFutureConfirmation, setSkipFutureConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submitRemove() {
    startTransition(async () => {
      await removeAction();
      setShowConfirmation(false);
      setSkipFutureConfirmation(false);
    });
  }

  function handleRemoveClick() {
    if (hasSavedRemovePreference()) {
      submitRemove();
      return;
    }

    setShowConfirmation(true);
  }

  function handleConfirmRemove() {
    if (skipFutureConfirmation) {
      saveRemovePreference();
    }

    submitRemove();
  }

  function handleCancel() {
    setShowConfirmation(false);
    setSkipFutureConfirmation(false);
  }

  return (
    <div
      className={[
        "river-spotlight-remove-action",
        showConfirmation ? "river-spotlight-remove-action-open" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="river-spotlight-action-button river-spotlight-action-danger"
        onClick={handleRemoveClick}
        disabled={isPending}
      >
        Remove
      </button>

      {showConfirmation ? (
        <div className="river-spotlight-remove-confirmation">
          <p className="river-spotlight-remove-confirmation-text">Are you sure?</p>
          <label className="river-spotlight-remove-confirmation-toggle">
            <input
              type="checkbox"
              checked={skipFutureConfirmation}
              onChange={(event) => {
                setSkipFutureConfirmation(event.target.checked);
              }}
              disabled={isPending}
            />
            <span>Don&apos;t ask this again in future</span>
          </label>
          <div className="river-spotlight-remove-confirmation-actions">
            <button
              type="button"
              className="river-spotlight-action-button river-spotlight-action-danger"
              onClick={handleConfirmRemove}
              disabled={isPending}
            >
              Confirm remove
            </button>
            <button
              type="button"
              className="river-spotlight-action-button"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
