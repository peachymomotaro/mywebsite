"use client";

import { useActionState, useRef } from "react";
import { deleteTaskAction, type DeleteTaskState } from "@/app/pops/actions";

/** Opening or cancelling the confirmation dialog never submits a deletion. */
export function DeleteTaskControl({ id, name, activeSubtasks }: { id: string; name: string; activeSubtasks: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initial: DeleteTaskState = { status: "idle", message: "" };
  const [state, submit, pending] = useActionState(deleteTaskAction, initial);
  const blocked = activeSubtasks > 0;

  return (
    <>
      <button type="button" className="pops-link-button pops-small" onClick={() => dialog.current?.showModal()}>
        Delete
      </button>
      <dialog
        ref={dialog}
        className="pops-delete-dialog"
        aria-labelledby={`delete-task-heading-${id}`}
        aria-describedby={`delete-task-description-${id}`}
      >
        <h2 id={`delete-task-heading-${id}`}>Delete “{name}”?</h2>
        <p id={`delete-task-description-${id}`}>
          This task will disappear from POps and will no longer be available to agents.
          Its historical activity and run records remain stored for audit purposes.
        </p>
        {blocked ? <p role="alert" className="pops-error">
          This task has {activeSubtasks} subtask{activeSubtasks === 1 ? "" : "s"}. Delete or move them first.
        </p> : null}
        {state.status === "error" ? <p role="alert" className="pops-error">{state.message}</p> : null}
        <form action={submit}>
          <input type="hidden" name="id" value={id} />
          <div className="pops-actions">
            <button type="button" className="pops-secondary" disabled={pending} onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="pops-danger" disabled={pending || blocked}>
              {pending ? "Deleting…" : "Delete task"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
