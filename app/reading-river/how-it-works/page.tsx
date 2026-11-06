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
            <h2>The Basics</h2>
            <p>1. Find things that you think are worth reading.</p>
            <p> 2. Put the things you think are worthwhile into the river, where they
              become fiches. Paste a link and we fetch its title and reading time for you.</p>
            <p> 3. When you want to read something, return to the river and go ficheing. </p>
            <p> 4. Three pieces drift by at a time. Choose one to bring it to the bank,
              or let them drift on and three others will come into view.</p>
            <p>
              5. I&apos;d recommend installing the Firefox extension, found{" "}
              <a
                href="https://addons.mozilla.org/en-GB/firefox/addon/reading-river/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-bold hover:text-blue-800"
              >
                here
              </a>, or the Chrome extension, found{" "}
              <a
                href="https://chromewebstore.google.com/detail/reading-river/gclbpodffcebdmecehkolmejiopfjhnl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline font-bold hover:text-blue-800"
              >
                here
              </a>.
            </p>
          </section>

          <section className="editorial-panel-soft river-how-section">
            <h2>The Philosophy and How It Works</h2>
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
              If you&apos;re interested, here is how the river chooses what drifts by:
            </p>
            <p>
              Each day a slow stream of them is chosen by gentle chance, and every piece has
              the same chance as any other. Anything that has just drifted past is less likely
              for a few days.
              Everything keeps some chance of appearing.
            </p>
            <p>
              You walk along the bank to see what is passing; a piece only opens up when you
              are close to it. Once you have stood beside a piece for a few seconds without
              opening it, it counts as seen. If that happens on two separate days, it rests
              upstream for three days; if it comes back and passes you again, it rests for a
              week. Pieces you never went to look at don&apos;t count, and nothing is marked or
              deleted.
            </p>
            <p>
              Anything you open stays on the bank, under Still reading, until you mark it as read
              or put it back in the river. Pieces that drifted past in the last week can be found
              again there too.
            </p>
             <p>
              Here are some of the sites that influenced the design of the Reading River:
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

          <section className="editorial-panel-soft river-how-section" aria-labelledby="river-how-music">
            <h2 id="river-how-music">Music</h2>
            <p>
              The river plays Johann Strauss II&apos;s <em>The Blue Danube</em>, performed by the
              United States Marine Band; as a work of the US government, the recording is in the
              public domain. It has been compressed and evened in volume for the web. The running water is a
              looped field recording; the birds and the rain are made in your browser as you walk.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
