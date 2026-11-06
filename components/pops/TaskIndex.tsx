import Link from "next/link";
import type { PopsTaskStatus, PopsWorkspace } from "@prisma/client";
import { Attention } from "@/components/pops/Attention";
import { QuickAdd } from "@/components/pops/QuickAdd";
import { TaskTable } from "@/components/pops/TaskTable";
import { ensurePopsDefaults } from "@/lib/pops/library";
import { listTasks } from "@/lib/pops/tasks";

const VIEWS: Record<string, { label: string; statuses: PopsTaskStatus[] }> = {
  open: { label: "Active and paused", statuses: ["active", "paused"] },
  completed: { label: "Completed", statuses: ["completed"] },
  archived: { label: "Archived", statuses: ["archived"] },
  all: { label: "All", statuses: ["active", "paused", "completed", "archived"] },
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
  const query = (v: string) => `${basePath}?view=${v}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;

  return (
    <>
      {error ? <p className="pops-notice pops-error" role="alert">{error}</p> : null}
      <QuickAdd workspace={workspace} back={basePath} />
      {current === "open" && !tag ? <Attention workspace={workspace} back={basePath} /> : null}
      <nav className="pops-filters" aria-label="Filter tasks">
        {Object.entries(VIEWS).map(([key, value]) => (
          <Link key={key} href={query(key)} aria-current={key === current ? "true" : undefined}>{value.label}</Link>
        ))}
        {tag ? (
          <span>
            Tag <span className="pops-tag">#{tag}</span> <Link href={`${basePath}?view=${current}`}>clear</Link>
          </span>
        ) : null}
      </nav>
      <TaskTable tasks={tasks} showWorkspace={!workspace} />
    </>
  );
}
