"use client";

import { useActionState } from "react";
import { importReportAction, type ImportState } from "@/app/pops/actions";

export function ImportReport({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importReportAction, { status: "idle", message: "" });
  return (
    <form action={action} aria-label="Import agent report">
      <input type="hidden" name="taskId" value={taskId} />
      <label htmlFor="pops-import">
        Paste ChatGPT&rsquo;s <code>pops-report</code> block (or its whole reply). Re-importing the same report is safe.
      </label>
      <textarea id="pops-import" name="report" className="pops-code" style={{ minHeight: "8em" }} required />
      <div className="pops-actions">
        <button type="submit" disabled={pending}>{pending ? "Importing…" : "Import report"}</button>
        {state.status !== "idle" ? (
          <span role="status" className={state.status === "error" ? "pops-error" : "pops-ok"}>{state.message}</span>
        ) : null}
      </div>
      {state.issues?.length ? (
        <ul className="pops-error pops-small">
          {state.issues.slice(0, 12).map((issue, i) => (
            <li key={i}><code>{issue.path || "report"}</code>: {issue.message}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
