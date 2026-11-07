import Link from "next/link";
import type { PopsWorkspace } from "@prisma/client";
import { snoozeAction } from "@/app/pops/actions";
import { getPopsDb } from "@/lib/pops/db";
import { ago } from "@/lib/pops/format";
import { getResurfacingCandidates } from "@/lib/pops/tasks";

/**
 * One short "Needs you" block: open decisions first, then a few quietly
 * neglected tasks. In-page only; nothing is sent anywhere.
 */
export async function Attention({ workspace, back, now = new Date() }: { workspace?: PopsWorkspace; back: string; now?: Date }) {
  const [decisions, neglected] = await Promise.all([
    getPopsDb().popsDecision.findMany({
      where: { status: "open", task: { workspace, status: { in: ["active", "paused"] } } },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    getResurfacingCandidates(now, workspace),
  ]);
  if (!decisions.length && !neglected.length) return null;

  return (
    <section className="pops-attention" aria-labelledby="pops-needs-you">
      <h2 id="pops-needs-you">Needs you</h2>
      <ul className="pops-list">
        {decisions.map((d) => (
          <li key={d.id}>
            <div className="pops-row">
              <Link href={`/pops/tasks/${d.task.id}#decision-${d.id}`}>{d.question}</Link>
              <span className="pops-meta">decide</span>
            </div>
            <div className="pops-sub">{d.task.title}</div>
          </li>
        ))}
        {neglected.map((task) => (
          <li key={task.id}>
            <div className="pops-row">
              <Link href={`/pops/tasks/${task.id}`} className="pops-plain">{task.title}</Link>
              <form action={snoozeAction}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="pops-link-button pops-small">Not now</button>
              </form>
            </div>
            <div className="pops-sub">{task.status === "paused" ? "Paused, untouched for " : "Untouched for "}{ago(task.lastHumanEngagementAt, now).replace(" ago", "")}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
