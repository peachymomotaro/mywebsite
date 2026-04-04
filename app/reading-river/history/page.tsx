import { getPrismaClient } from "@/lib/reading-river/db";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export const dynamic = "force-dynamic";

const readDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

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

    return (
      <main className="river-history-page">
        <section className="river-history-head">
          <h1 className="river-history-title">Read history</h1>
          <p className="river-history-intro">
            The pieces you finished live here, ordered by the day you marked them as read.
          </p>
        </section>

        {readEvents.length > 0 ? (
          <ul className="river-history-list">
            {readEvents.map((readEvent) => (
              <li key={readEvent.id} className="river-history-item">
                <div className="river-history-item-head">
                  {readEvent.readingItem.sourceUrl ? (
                    <a href={readEvent.readingItem.sourceUrl} className="river-history-link">
                      {readEvent.readingItem.title}
                    </a>
                  ) : (
                    <h2 className="river-history-item-title">{readEvent.readingItem.title}</h2>
                  )}
                </div>
                <p className="river-history-meta">
                  {readEvent.readingItem.siteName ? <span>{readEvent.readingItem.siteName}</span> : null}
                  {readEvent.readingItem.siteName ? <span aria-hidden="true"> • </span> : null}
                  <span>{readDateFormatter.format(readEvent.readAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="river-spotlight-empty">Nothing marked as read yet.</p>
        )}
      </main>
    );
  });
}
