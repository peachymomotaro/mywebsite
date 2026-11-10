"use client";

import { useActionState, useRef } from "react";
import { deletePipelineAction, type DeletePipelineState } from "@/app/pops/actions";

/** A deletion is never triggered by merely opening or dismissing the dialog. */
export function DeletePipelineControl({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initial: DeletePipelineState = { status: "idle", message: "" };
  const [state, submit, pending] = useActionState(deletePipelineAction, initial);

  return (
    <>
      <button type="button" className="pops-link-button pops-small" onClick={() => dialog.current?.showModal()}>
        Delete
      </button>
      <dialog ref={dialog} className="pops-delete-dialog" aria-labelledby={`delete-heading-${id}`} aria-describedby={`delete-description-${id}`}>
        <h2 id={`delete-heading-${id}`}>Delete “{name}”?</h2>
        <p id={`delete-description-${id}`}>This pipeline will disappear from your library and will not be available for new runs. Past runs and versions will be preserved.</p>
        {state.status === "error" ? <p role="alert" className="pops-error">{state.message}</p> : null}
        <form action={submit}>
          <input type="hidden" name="id" value={id} />
          <div className="pops-actions">
            <button className="pops-secondary" type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button>
            <button className="pops-danger" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete pipeline"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
