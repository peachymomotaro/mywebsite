import type { Metadata } from "next";
import {
  readingRiverChangelogEntries,
  type ReadingRiverChangelogItem,
} from "@/lib/reading-river/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Recent product changes to Reading River.",
};

function renderChangelogItem(item: ReadingRiverChangelogItem) {
  if (typeof item === "string") {
    return item;
  }

  return (
    <>
      {item.text}
      <a href={item.href}>{item.linkText}</a>
      {item.suffix}
    </>
  );
}

/** Laid out like How It Works: the date in the margin, the change beside it. */
export default function ChangelogPage() {
  return (
    <main className="editorial-page river-how-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <h1 className="editorial-page-title">Changelog</h1>
            <p className="editorial-page-intro">
              A record of changes to Reading River.
            </p>
          </div>
        </header>

        <div className="editorial-page-content river-how-page-content" aria-label="Recent changes" role="region">
          {readingRiverChangelogEntries.map((entry) => {
            const headingId = `changelog-${entry.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return (
              <section key={entry.slug} className="river-how-section" aria-labelledby={headingId}>
                <p className="river-page-margin-note">{entry.date}</p>
                <div className="river-how-copy">
                  <h2 id={headingId}>{entry.title}</h2>
                  <ul className="river-how-steps river-changelog-items">
                    {entry.items.map((item, index) => (
                      <li key={typeof item === "string" ? item : `${item.href}-${index}`}>
                        {renderChangelogItem(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
