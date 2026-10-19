"use client";

import { useActionState } from "react";
import { changeEddyArticle } from "@/app/reading-river/actions/eddies";
import type { EddyActionState } from "@/lib/reading-river/eddy-state";

const initialState: EddyActionState = { status: "idle" };

// One pending state covers both row actions; no optimistic success on failure.
export function EddyArticleActions({ id, inEddies, showRead = false }: {
  id: string;
  inEddies: boolean;
  showRead?: boolean;
}) {
  const [state, action, pending] = useActionState(async (previous: EddyActionState, data: FormData) => {
    const operation = data.get("operation") === "read" ? "read" : inEddies ? "remove" : "add";
    return changeEddyArticle(id, operation, previous, data);
  }, initialState);

  return (
    <form action={action} className="river-eddy-actions" aria-busy={pending}>
      {showRead ? (
        <button type="submit" name="operation" value="read" className="river-eddy-text-action" disabled={pending}>
          Mark as read
        </button>
      ) : null}
      <button type="submit" name="operation" value="membership" className="river-eddy-text-action" disabled={pending}>
        {inEddies ? "Remove from eddies" : "Keep in the eddies"}
      </button>
      <span role="status" aria-live="polite" className="river-eddy-feedback">
        {pending ? "Saving…" : state.message}
      </span>
    </form>
  );
}
