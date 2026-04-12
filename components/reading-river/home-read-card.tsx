import Link from "next/link";
import {
  deleteReadingItem,
  markAsRead,
  skipReadingItem,
} from "@/app/reading-river/actions/reading-items";
import { HomeCardTags } from "@/components/reading-river/home-card-tags";
import { HomeRemoveAction } from "@/components/reading-river/home-remove-action";
import type { HomePageFeaturedItem } from "@/lib/reading-river/homepage-data";
import { readingRiverItemEditPath } from "@/lib/reading-river/routes";

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

  async function deleteReadingItemAction() {
    "use server";

    if (!item) {
      return;
    }

    await deleteReadingItem({ id: item.id });
  }

  return (
    <section className="river-spotlight-card">
      <div className="river-spotlight-card-head">
        <p className="river-section-label">{label}</p>
        {item ? (
          <Link
            href={readingRiverItemEditPath(item.id)}
            className="river-spotlight-edit-link"
            aria-label={`Edit ${item.title}`}
          >
            Edit
          </Link>
        ) : null}
      </div>

      {item ? (
        <div className="river-spotlight-body">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} className="river-spotlight-link river-spotlight-title-wrap">
              {item.title}
            </a>
          ) : (
            <h2 className="river-spotlight-title river-spotlight-title-wrap">{item.title}</h2>
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

          <div className="river-spotlight-footer">
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
                <button
                  type="submit"
                  className="river-spotlight-action-button river-spotlight-action-secondary"
                >
                  Skip
                </button>
              </form>
              <HomeRemoveAction removeAction={deleteReadingItemAction} />
            </div>

            <HomeCardTags tags={item.tags} />
          </div>
        </div>
      ) : (
        <p className="river-spotlight-empty">{emptyMessage}</p>
      )}
    </section>
  );
}
