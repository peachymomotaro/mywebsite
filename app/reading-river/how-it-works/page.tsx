import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "How to use Reading River and where its philosophy comes from.",
};

const influences = [
  {
    href: "https://www.oliverburkeman.com/river",
    label: "Oliver Burkeman on the river",
    description:
      "An influence on treating reading as a stream you choose from, not a backlog you must clear.",
  },
  {
    href: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
    label: "David Epstein, How To Improve Your Information Diet",
    description:
      "An influence on subtraction audits, pruning inputs, and delaying urgent-feeling reads.",
  },
  {
    href: "https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention",
    label: "Andy Matuschak, Spaced repetition systems can be used to program attention",
    description:
      "An influence on thinking clearly about systems that direct attention, and on what Reading River is not.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="editorial-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <p className="editorial-page-kicker">Reading River</p>
            <h1 className="editorial-page-title">How It Works</h1>
            <p className="editorial-page-intro">
              Reading River is a way to lower the pressure to read everything and make
              calmer choices about what to read next.
            </p>
            <p className="editorial-page-intro">
              If you want the deeper philosophy behind it, the influences are linked at
              the bottom.
            </p>
          </div>
        </header>

        <hr className="editorial-page-rule" />

        <section className="editorial-page-content river-how-page-content">
          <section className="editorial-panel-soft river-how-section">
            <h2>How it works</h2>
            <p>
              Add things that look worth reading without treating them as immediate
              obligations.
            </p>
            <p>
              Let the stream hold possibilities for you, so you do not have to keep a
              growing reading burden in your head.
            </p>
            <p>
              Use the time budget and your own priorities to shape what feels worth
              reading now.
            </p>
            <p>
              Edit, skip, and prune regularly. The point is not to keep everything. The
              point is to keep the stream useful to you.
            </p>
            <p>
              Reading River is meant to be highly personal. You can tune it around your
              interests, your available time, and the kind of reading life you actually
              want.
            </p>
          </section>

          <section className="editorial-panel-soft river-how-section">
            <h2>Philosophy and influences</h2>
            <p>
              The core idea is that worthwhile reading behaves more like a river than a
              pile you will someday finish. You choose from the flow; you do not clear it.
            </p>
            <p>
              Reading River also borrows from the idea of doing regular subtraction
              audits: removing sources, trimming obligations, and noticing which reads are
              actually worth bringing back.
            </p>
            <p>
              It also takes seriously the value of delay. If something only feels urgent
              because of a headline, letting it sit for a few hours or a day can be a
              useful filter.
            </p>
            <p>
              This is not a form of spaced attention. It is not trying to schedule your
              mind with an expanding algorithm. It is a calmer way to collect options,
              reduce pressure, and choose deliberately.
            </p>

            <ul className="river-how-source-list">
              {influences.map((influence) => (
                <li key={influence.href} className="river-how-source-item">
                  <a
                    href={influence.href}
                    target="_blank"
                    rel="noreferrer"
                    className="river-how-source-link"
                  >
                    {influence.label}
                  </a>
                  <p>{influence.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </div>
    </main>
  );
}
