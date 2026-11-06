import Link from "next/link";
import type { listTasks } from "@/lib/pops/tasks";
import { WORKSPACES } from "@/lib/pops/constants";
import { ago } from "@/lib/pops/format";

type Rows = Awaited<ReturnType<typeof listTasks>>;

export function TaskTable({ tasks, showWorkspace = true, now = new Date() }: { tasks: Rows; showWorkspace?: boolean; now?: Date }) {
  if (!tasks.length) return <p className="pops-muted">Nothing here.</p>;
  return (
    <table className="pops-tasklist">
      <thead>
        <tr>
          <th scope="col">Task</th>
          {showWorkspace ? <th scope="col">Workspace</th> : null}
          <th scope="col">Next action</th>
          <th scope="col">Last touched</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>
              <Link href={`/pops/tasks/${task.id}`}>{task.title}</Link>
              {task.parentId ? <span className="pops-tag"> · subtask</span> : null}
              <div>
                {task.status !== "active" ? (
                  <span className="pops-status" data-status={task.status}>{task.status} </span>
                ) : null}
                {task.projectTags.map((tag) => (
                  <Link key={tag} href={`/pops?tag=${encodeURIComponent(tag)}`} className="pops-tag">#{tag}</Link>
                ))}
                {task._count.decisions ? (
                  <span className="pops-flag">{task._count.decisions === 1 ? "decision waiting" : `${task._count.decisions} decisions waiting`}</span>
                ) : null}
              </div>
            </td>
            {showWorkspace ? <td className="pops-ws">{WORKSPACES[task.workspace].label}</td> : null}
            <td className="pops-next">{task.suggestedNextAction || "—"}</td>
            <td className="pops-meta">{ago(task.lastHumanEngagementAt, now)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
