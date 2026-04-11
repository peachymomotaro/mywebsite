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
      "The primary inspiration for the philosophy of this site.",
  },
  {
    href: "https://davidepstein.substack.com/p/how-to-improve-your-information-diet",
    label: "David Epstein, How To Improve Your Information Diet",
    description:
      "The Reading River offers another way of improving your information diet, by reducing the amount of reading you have to attend to. There's too much out there, and the Reading River washes most of it away into the future.",
  },
  {
    href: "https://notes.andymatuschak.org/Spaced_repetition_systems_can_be_used_to_program_attention",
    label: "Andy Matuschak, Spaced repetition systems can be used to program attention",
    description:
      "The Reading River can also be thought of a way of saying that you will attend to something in the future, just not right now. Or, 'I will pay attention this later.'",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="editorial-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <h1 className="editorial-page-title">How It Works</h1>
            <p className="editorial-page-intro">
              Reading River is a way to lower the pressure to read everything and make calmer choices about what to read next.
            </p>
          </div>
        </header>

        <hr className="editorial-page-rule" />

        <section className="editorial-page-content river-how-page-content">
          <section className="editorial-panel-soft river-how-section">
            <p>Find things that you think are worth reading.</p>
            <p>
              Put the things you think are worthwhile into the river, where they
              become fiches. Set how important a fiche is to you by using the priority setting.
            </p>
            <p>
              When you want to read something, return to the river and go ficheing.
            </p>
            <p>
              The left option is the &apos;most important&apos; option based on the
              priority setting and the amount of time you have. The right button is a
              randomly selected piece of reading.
            </p>
          </section>

          <section className="editorial-panel-soft river-how-section">
            <h2>Philosophy and More on How It Works</h2>
            <p>
              The core idea is that your reading list should be more like a river
              than a bucket. You wade in at a spot, grab something you want to read,
              and then sit by the banks.
            </p>
            <p>
              The Reading River is about escaping from urgency.
              Things often seem much more important than they are when we see them
              for the first time. Add anything you don&apos;t need to read this
              second to the river, and let it sit for some time. It will become
              clear whether it was worth reading.
            </p>
            <p>
              If you&apos;re interested, the priority algorithm for Reading River is
              as follows: 
            </p>
            <p>
              If you set how long you have to read, it first winnows your list down to pieces
              that fit that budget, falling back to shorter options if needed. 
              Then it sorts by a simple equation that considers the priority, reading
              time, and age.
            </p>
            <p>
              If you do not choose a time budget, it prefers high-priority short reads, 
              then high-priority long reads, then lower-priority short reads, and then 
              everything else. 
            </p>
            <p>
              Skipping a read lowers its priority score, making it less likely to appear in future.
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
