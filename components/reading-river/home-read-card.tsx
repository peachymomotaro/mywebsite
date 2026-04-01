import { markAsRead, skipReadingItem } from "@/app/reading-river/actions/reading-items";
import type { HomePageFeaturedItem } from "@/lib/reading-river/homepage-data";

type HomeReadCardProps = {
  label: string;
  item: HomePageFeaturedItem | null;
  emptyMessage: string;
};

export function HomeReadCard({ label, item, emptyMessage }: HomeReadCardProps) {
  async function markAsReadAction() {
    "use server";

    if (!item) {
      return;
    }

    await markAsRead({ id: item.id });
  }

  async function skipReadingItemAction() {
    "use server";

    if (!item) {
      return;
    }

    await skipReadingItem({ id: item.id });
  }

  return (
    <section className="river-spotlight-card">
      <p className="river-section-label">{label}</p>

      {item ? (
        <div className="river-spotlight-body">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} className="river-spotlight-link">
              {item.title}
            </a>
          ) : (
            <h2 className="river-spotlight-title">{item.title}</h2>
          )}

          {[item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(
            Boolean,
          ).length > 0 ? (
            <p className="river-spotlight-meta">
              {[item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null]
                .filter(Boolean)
                .join(" • ")}
            </p>
          ) : null}

          <div className="river-spotlight-actions">
            <form action={markAsReadAction}>
              <button
                type="submit"
                className="river-spotlight-action-button river-spotlight-action-primary"
              >
                Mark as read
              </button>
            </form>
            <form action={skipReadingItemAction}>
              <button type="submit" className="river-spotlight-action-button">
                Skip
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p className="river-spotlight-empty">{emptyMessage}</p>
      )}
    </section>
  );
}
