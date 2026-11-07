import type { PopsWorkspace } from "@prisma/client";
import { createTaskAction } from "@/app/pops/actions";
import { WORKSPACE_KEYS, WORKSPACES } from "@/lib/pops/constants";

/** One line. Description, tags and everything else are added on the task page. */
export function QuickAdd({ workspace, back }: { workspace?: PopsWorkspace; back: string }) {
  return (
    <form action={createTaskAction} className="pops-quickadd pops-inline" aria-label="New task">
      <input type="hidden" name="back" value={back} />
      <input name="title" placeholder="New task" required maxLength={200} aria-label="Task title" />
      {workspace ? (
        <input type="hidden" name="workspace" value={workspace} />
      ) : (
        <select name="workspace" defaultValue="learn" aria-label="Workspace">
          {WORKSPACE_KEYS.map((key) => (
            <option key={key} value={key}>{WORKSPACES[key].label}</option>
          ))}
        </select>
      )}
      <button type="submit">Add</button>
    </form>
  );
}
