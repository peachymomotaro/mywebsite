import type { PopsWorkspace } from "@prisma/client";
import { createTaskAction } from "@/app/pops/actions";
import { WORKSPACE_KEYS, WORKSPACES } from "@/lib/pops/constants";

export function QuickAdd({ workspace, back }: { workspace?: PopsWorkspace; back: string }) {
  return (
    <form action={createTaskAction} className="pops-quickadd" aria-label="New task">
      <input type="hidden" name="back" value={back} />
      <div className="pops-inline">
        <input name="title" placeholder="New task — e.g. Understand energy-based models" required maxLength={200} aria-label="Task title" />
        <select name="workspace" defaultValue={workspace ?? "learn"} aria-label="Workspace">
          {WORKSPACE_KEYS.map((key) => (
            <option key={key} value={key}>{WORKSPACES[key].label}</option>
          ))}
        </select>
        <button type="submit">Add</button>
      </div>
      <details>
        <summary>Description and tags</summary>
        <label htmlFor="qa-description">Description</label>
        <textarea id="qa-description" name="description" maxLength={8000} />
        <label htmlFor="qa-tags">Project tags (comma separated)</label>
        <input id="qa-tags" name="tags" />
      </details>
    </form>
  );
}
