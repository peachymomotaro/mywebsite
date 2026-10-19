import Link from "next/link";
import { EddyArticleActions } from "./eddy-article-actions";
import { EDDY_CAPACITY, EDDIES_FULL_MESSAGE } from "@/lib/reading-river/eddy-state";
import type { EddyArticle } from "@/lib/reading-river/eddies";
import { readingRiverPath } from "@/lib/reading-river/routes";

export function EddiesSection({ items }: { items: EddyArticle[] }) {
  const full = items.length === EDDY_CAPACITY;
  return (
    <section className="river-eddies" aria-labelledby="river-eddies-title">
      <div className="river-eddies-heading">
        <h2 id="river-eddies-title">In the eddies</h2>
        <span className="river-eddies-count" aria-live="polite">{items.length} of {EDDY_CAPACITY}</span>
        {items.length > 0 ? (
          <Link prefetch={false} className="river-eddy-text-action" href={readingRiverPath(full ? "/add" : "/add?eddies=1")}>
            {full ? "Add to stream" : "Add article"}
          </Link>
        ) : null}
      </div>
      {full ? <p className="river-eddies-note">{EDDIES_FULL_MESSAGE}</p> : null}
      {items.length === 0 ? (
        <div className="river-eddies-empty">
          <p>Keep up to ten articles here when you want to give them your attention.</p>
          <Link prefetch={false} className="river-eddy-text-action" href={readingRiverPath("/add?eddies=1")}>Add an article</Link>
        </div>
      ) : (
        <ul className="river-eddies-list">
          {items.map((item) => (
            <li key={item.id}>
              <article aria-labelledby={`eddy-title-${item.id}`}>
                <h3 id={`eddy-title-${item.id}`}>
                  {item.sourceUrl ? <a href={item.sourceUrl}>{item.title}</a> : item.title}
                </h3>
                {item.siteName || item.estimatedMinutes ? (
                  <p className="river-eddies-meta">
                    {[item.siteName, item.estimatedMinutes ? `${item.estimatedMinutes} min` : null].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                <EddyArticleActions id={item.id} inEddies showRead />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
