import type { Metadata } from "next";
import { readingRiverChangelogEntries } from "@/lib/reading-river/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Recent product changes to Reading River.",
};

export default function ChangelogPage() {
  return (
    <main className="river-page">
      <section className="editorial-page-masthead">
        <div className="editorial-page-masthead-copy">
          <h1 className="editorial-page-title">Changelog</h1>
          <p className="editorial-page-intro">
            A record of changes to Reading River.
          </p>
        </div>
      </section>

      <section className="river-changelog-list" aria-label="Recent changes">
        {readingRiverChangelogEntries.map((entry) => (
          <article key={entry.slug} className="editorial-panel-soft river-changelog-entry">
            <header className="river-changelog-entry-header">
              <p className="editorial-page-kicker">{entry.date}</p>
              <h2 className="river-changelog-entry-title">{entry.title}</h2>
            </header>
            <ul className="river-changelog-items">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
