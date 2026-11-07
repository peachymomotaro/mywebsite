import Link from "next/link";
import type { listTasks } from "@/lib/pops/tasks";
import { WORKSPACES } from "@/lib/pops/constants";
import { ago } from "@/lib/pops/format";

type Rows = Awaited<ReturnType<typeof listTasks>>;

/** Two lines per task: what it is, then where it stands. */
export function TaskTable({ tasks, showWorkspace = true, now = new Date() }: { tasks: Rows; showWorkspace?: boolean; now?: Date }) {
  if (!tasks.length) return <p className="pops-empty">Nothing here.</p>;
  return (
    <ul className="pops-list">
      {tasks.map((task) => {
        const where = showWorkspace ? `${WORKSPACES[task.workspace].label}, ` : "";
        const sub = [task.status === "paused" ? "Paused." : null, task.suggestedNextAction ? `Next: ${task.suggestedNextAction}` : null]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={task.id}>
            <div className="pops-row">
              <span>
                <Link href={`/pops/tasks/${task.id}`} className="pops-plain">{task.title}</Link>
                {task._count.decisions ? <span className="pops-flag">decision waiting</span> : null}
              </span>
              <span className="pops-meta">{where}{ago(task.lastHumanEngagementAt, now)}</span>
            </div>
            {sub ? <div className="pops-sub">{sub}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
