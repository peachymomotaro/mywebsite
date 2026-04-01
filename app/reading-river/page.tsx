import { readingRiverPath } from "@/lib/reading-river/routes";

export default function ReadingRiverPage() {
  return (
    <main className="editorial-page">
      <section className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <p className="editorial-page-kicker">Reading River</p>
            <h1 className="editorial-page-title">Pick your next read</h1>
            <p className="editorial-page-intro">
              A calm reading triage space for choosing the next worthwhile
              thing to read.
            </p>
          </div>
          <a href={readingRiverPath("/add")} className="river-shell-nav-link">
            Add to stream
          </a>
        </header>

        <hr className="editorial-page-rule" />

        <section className="editorial-page-content">
          <article className="editorial-panel">
            <h2 className="card-title">Next priority read</h2>
            <p className="card-meta">
              The fully personalized stream will appear here after the rest of
              the app is ported.
            </p>
          </article>

          <article className="editorial-panel-soft">
            <h2 className="card-title">From the stream</h2>
            <p className="card-meta">
              This landing page is now inside the Reading River shell and route
              scope.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
