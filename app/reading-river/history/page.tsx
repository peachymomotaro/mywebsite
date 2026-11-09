import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export const dynamic = "force-dynamic";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

type HistoryEntry = {
  id: string;
  readAt: Date;
  readingItem: { id: string; title: string; sourceUrl: string | null; siteName: string | null };
};

/** Reads arrive newest first, so months come out newest first too. */
function groupByMonth(entries: HistoryEntry[]) {
  const months: { label: string; key: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const key = `${entry.readAt.getUTCFullYear()}-${entry.readAt.getUTCMonth()}`;
    const current = months.at(-1);
    if (current?.key === key) current.entries.push(entry);
    else months.push({ key, label: monthFormatter.format(entry.readAt), entries: [entry] });
  }
  return months;
}

/** Laid out like How It Works: each month in the margin, what you finished beside it. */
export default async function HistoryPage() {
  return measureReadingRiverTiming("page.reading-river-history.render", async () => {
    const prisma = getPrismaClient();
    const currentUser = await requireCurrentUser();
    const readEvents = await prisma.readEvent.findMany({
      orderBy: {
        readAt: "desc",
      },
      where: {
        userId: currentUser.id,
      },
      include: {
        readingItem: {
          select: {
            id: true,
            title: true,
            sourceUrl: true,
            siteName: true,
          },
        },
      },
    });
    const months = groupByMonth(readEvents);
    const count = readEvents.length;

    return (
      <main className="editorial-page river-how-page">
        <div className="editorial-page-surface">
          <header className="editorial-page-masthead">
            <div className="editorial-page-masthead-copy">
              <h1 className="editorial-page-title">Read history</h1>
              <p className="editorial-page-intro">
                {count > 0
                  ? `You have finished ${count === 1 ? "one piece" : `${count} pieces`}. Each one also has a golden tree by the river.`
                  : "The pieces you finish will gather here, each with a golden tree by the river."}
              </p>
            </div>
          </header>

          <div className="editorial-page-content river-how-page-content">
            {months.length > 0 ? months.map((month) => (
              <section key={month.key} className="river-how-section" aria-labelledby={`river-history-${month.key}`}>
                <h2 id={`river-history-${month.key}`}>{month.label}</h2>
                <ul className="river-history-list">
                  {month.entries.map((readEvent) => (
                    <li key={readEvent.id} className="river-history-item">
                      <h3 className="river-history-item-title">
                        {readEvent.readingItem.sourceUrl ? (
                          <a href={readEvent.readingItem.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="river-history-link">
                            {readEvent.readingItem.title}
                          </a>
                        ) : readEvent.readingItem.title}
                      </h3>
                      <p className="river-history-meta">
                        {readEvent.readingItem.siteName ? `${readEvent.readingItem.siteName}, ` : ""}
                        finished <time dateTime={readEvent.readAt.toISOString()}>{dayFormatter.format(readEvent.readAt)}</time>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )) : (
              <section className="river-how-section" aria-labelledby="river-history-empty">
                <h2 id="river-history-empty">Nothing yet</h2>
                <div className="river-how-copy">
                  <p>When you finish a piece in the eddies, it appears here.</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    );
  });
}
