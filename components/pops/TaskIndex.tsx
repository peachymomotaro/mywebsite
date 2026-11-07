import Link from "next/link";
import type { PopsTaskStatus, PopsWorkspace } from "@prisma/client";
import { Attention } from "@/components/pops/Attention";
import { QuickAdd } from "@/components/pops/QuickAdd";
import { TaskTable } from "@/components/pops/TaskTable";
import { ensurePopsDefaults } from "@/lib/pops/library";
import { listTasks } from "@/lib/pops/tasks";

const VIEWS: Record<string, { label: string; heading: string; statuses: PopsTaskStatus[] }> = {
  open: { label: "Open", heading: "Tasks", statuses: ["active", "paused"] },
  completed: { label: "Completed", heading: "Completed", statuses: ["completed"] },
  archived: { label: "Archived", heading: "Archived", statuses: ["archived"] },
};

export async function TaskIndex({
  basePath,
  workspace,
  view = "open",
  tag,
  error,
}: {
  basePath: string;
  workspace?: PopsWorkspace;
  view?: string;
  tag?: string;
  error?: string;
}) {
  await ensurePopsDefaults();
  const current = VIEWS[view] ? view : "open";
  const tasks = await listTasks({ workspace, statuses: VIEWS[current].statuses, tag });
  const href = (v: string) => (v === "open" ? basePath : `${basePath}?view=${v}`);

  return (
    <>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}
      <QuickAdd workspace={workspace} back={basePath} />
      {current === "open" && !tag ? <Attention workspace={workspace} back={basePath} /> : null}
      <div className="pops-listhead">
        <h2>{tag ? `#${tag}` : VIEWS[current].heading}</h2>
        <nav className="pops-filters" aria-label="Filter tasks">
          {tag ? <Link href={basePath}>Clear tag</Link> : null}
          {Object.entries(VIEWS).map(([key, value]) => (
            <Link key={key} href={href(key)} aria-current={key === current && !tag ? "true" : undefined}>{value.label}</Link>
          ))}
        </nav>
      </div>
      <TaskTable tasks={tasks} showWorkspace={!workspace} />
    </>
  );
}
