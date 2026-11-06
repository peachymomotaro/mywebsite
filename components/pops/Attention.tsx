import Link from "next/link";
import type { PopsWorkspace } from "@prisma/client";
import { keepAction, snoozeAction, setStatusAction } from "@/app/pops/actions";
import { getPopsDb } from "@/lib/pops/db";
import { ago } from "@/lib/pops/format";
import { getResurfacingCandidates } from "@/lib/pops/tasks";

/** Open decisions first, then a few quietly neglected tasks. In-page only. */
export async function Attention({ workspace, back, now = new Date() }: { workspace?: PopsWorkspace; back: string; now?: Date }) {
  const [decisions, neglected] = await Promise.all([
    getPopsDb().popsDecision.findMany({
      where: { status: "open", task: { workspace, status: { in: ["active", "paused"] } } },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    getResurfacingCandidates(now, workspace),
  ]);

  return (
    <>
      {decisions.length ? (
        <section className="pops-strip pops-strip--decisions" aria-labelledby="pops-waiting">
          <h2 id="pops-waiting">Waiting for you</h2>
          <ul>
            {decisions.map((d) => (
              <li key={d.id}>
                <Link href={`/pops/tasks/${d.task.id}#decision-${d.id}`}>{d.question}</Link>
                <span className="pops-meta">{d.task.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {neglected.length ? (
        <section className="pops-strip" aria-labelledby="pops-resurface">
          <h2 id="pops-resurface">Not touched for a while</h2>
          <ul>
            {neglected.map((task) => (
              <li key={task.id}>
                <Link href={`/pops/tasks/${task.id}`}>{task.title}</Link>
                <span className="pops-meta">{task.status}, {ago(task.lastHumanEngagementAt, now)}</span>
                <form action={keepAction}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="pops-link-button">Still relevant</button>
                </form>
                <form action={snoozeAction}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="pops-link-button">Not now</button>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="status" value="archived" />
                  <input type="hidden" name="back" value={back} />
                  <button type="submit" className="pops-link-button">Archive</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
