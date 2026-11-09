import type { Metadata } from "next";
import { DRIFT_RULES } from "@/lib/reading-river/drift";

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

/** The paintings the river quotes as things to find. None is labelled in the river itself. */
const paintings = [
  {
    href: "https://en.wikipedia.org/wiki/Water_Lilies_(Monet_series)",
    label: "Claude Monet, Water Lilies",
    description: "The lily pads round the eddies, and the footbridge, after Monet's Japanese bridge at Giverny.",
  },
  {
    href: "https://en.wikipedia.org/wiki/The_Hay_Wain",
    label: "John Constable, The Hay Wain",
    description: "A wain standing in the ford downstream, and a cottage on the far bank with smoke from its chimney.",
  },
  {
    href: "https://en.wikipedia.org/wiki/The_Oxbow",
    label: "Thomas Cole, The Oxbow",
    description: "Upstream, the river swings round a great loop of patchwork fields.",
  },
  {
    href: "https://en.wikipedia.org/wiki/A_Sunday_Afternoon_on_the_Island_of_La_Grande_Jatte",
    label: "Georges Seurat, A Sunday Afternoon on the Island of La Grande Jatte",
    description: "Parasols planted in the grass on the bank, painted in dots of colour.",
  },
  {
    href: "https://en.wikipedia.org/wiki/The_Fighting_Temeraire",
    label: "J. M. W. Turner, The Fighting Temeraire",
    description: "A model of the old warship, pale as a ghost, towed downstream by a little steam tug.",
  },
  {
    href: "https://en.wikipedia.org/wiki/The_Lady_of_Shalott_(painting)",
    label: "John William Waterhouse, The Lady of Shalott",
    description: "Her boat, moored in the reeds, with one candle still lit.",
  },
  {
    href: "https://en.wikipedia.org/wiki/The_Source_of_the_Loue",
    label: "Gustave Courbet, The Source of the Loue",
    description: "Upstream, a spring running out of a dark cave in the far bank.",
  },
  {
    href: "https://en.wikipedia.org/wiki/La_Grenouill%C3%A8re_(Monet)",
    label: "Claude Monet and Pierre-Auguste Renoir, La Grenouillère",
    description: "Downstream, a little round island with one tree and rowboats tied up beside it.",
  },
  {
    href: "https://en.wikipedia.org/wiki/Aelbert_Cuyp",
    label: "Aelbert Cuyp's river landscapes",
    description: "Cows standing in the shallows, flicking their tails.",
  },
  {
    href: "https://en.wikipedia.org/wiki/Langlois_Bridge_at_Arles",
    label: "Vincent van Gogh, Langlois Bridge at Arles",
    description: "An ochre drawbridge, which lifts to let the Temeraire through.",
  },
  {
    href: "https://en.wikipedia.org/wiki/Sudden_Shower_over_Shin-%C5%8Chashi_Bridge_and_Atake",
    label: "Utagawa Hiroshige, Sudden Shower over Shin-Ōhashi Bridge and Atake",
    description: "One stretch of river under its own small rain cloud.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="editorial-page river-how-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <h1 className="editorial-page-title">How It Works</h1>
            <p className="editorial-page-intro">
              Reading River is a way to lower the pressure to read everything and make calmer choices about what to read next.
            </p>
          </div>
        </header>

        <div className="editorial-page-content river-how-page-content">
          <section className="river-how-section" aria-labelledby="river-how-philosophy">
            <h2 id="river-how-philosophy">The Philosophy</h2>
            <div className="river-how-copy">
              <p>Your reading list should be more like a river than a bucket. You wade in at
                a spot, grab something you want to read, and sit by the bank.</p>
              <p>Reading River is about escaping urgency. Things often seem more important
                when we first see them. Add anything you don&apos;t need to read this second
                to the river and give it time. It will become clearer whether it was worth reading.</p>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-basics">
            <h2 id="river-how-basics">The Basics</h2>
            <div className="river-how-copy">
              <ol className="river-how-steps">
                <li>Find things that you think are worth reading.</li>
                <li>Put the things you think are worthwhile into the river, where they become fiches.
                  Paste a link and we fetch its title and reading time for you.</li>
                <li>When you want to read something, return to the river and go ficheing.
                  Tap the bank or use the arrow keys to walk; drag to look around.</li>
                <li>Pieces arrive in a continuous stream. Walk close to a paper boat to see its title,
                  choose it, then select <strong>Start reading</strong>. Leave anything that
                  doesn&apos;t catch your attention to drift on.</li>
              </ol>
              <p>Save links while you browse with the{" "}
                <a href="https://addons.mozilla.org/en-GB/firefox/addon/reading-river/" target="_blank" rel="noopener noreferrer">Firefox extension</a>{" "}
                or the{" "}
                <a href="https://chromewebstore.google.com/detail/reading-river/gclbpodffcebdmecehkolmejiopfjhnl" target="_blank" rel="noopener noreferrer">Chrome extension</a>.
                The + button on the river adds a link too.
              </p>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-reading">
            <h2 id="river-how-reading">Reading and finishing</h2>
            <div className="river-how-copy">
              <p>Opening an article carries it into the eddies, the pool beside the river.
                This happens whether you open it on the river or from your reminder email.
                The pool holds up to five pieces. Walk over to continue one, mark it as read,
                or let it drift back into the river. If you start a sixth, the oldest piece
                in the pool returns to the stream.</p>
              <p>Finishing an article plants a golden tree. Walk up to a tree to see the finished
                article&apos;s title above it; tap the title, then <strong>Re-read</strong> to read
                it again.</p>
              <p>Your eddies are kept between visits, so you can carry on reading when you return.</p>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-draw">
            <h2 id="river-how-draw">What drifts by</h2>
            <div className="river-how-copy">
              <p>Each day the {DRIFT_RULES.streamLength} articles in the river are chosen randomly.
                Each article is represented by a paper boat (I like to imagine unfolding the paper
                boat in order to read what it says!). All the articles in your river have the same
                chance of appearing, and once they&apos;re in the river for the day, they just keep
                circulating. Things you have seen recently are less likely for a few days.</p>
              <p>A piece counts as seen after you have stood close enough to see its title for
                a few seconds. If you pass it unread on two separate days, it rests upstream for
                a few days. If it returns and passes you again, it goes upstream for a week.
                Nothing happens to anything you didn&apos;t see, and nothing is marked as read or
                deleted. This mechanism is just to prevent the river from showing you the same
                things repetitively, which tended to put me off in early versions of the app.</p>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-inspiration">
            <h2 id="river-how-inspiration">Inspiration</h2>
            <div className="river-how-copy">
              <ul className="river-how-source-list">
                {influences.map((influence) => (
                  <li key={influence.href} className="river-how-source-item">
                    <a href={influence.href} target="_blank" rel="noreferrer" className="river-how-source-link">
                      {influence.label}
                    </a>
                    <p>{influence.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-paintings">
            <h2 id="river-how-paintings">The Paintings</h2>
            <div className="river-how-copy">
              <p>The river features small references to famous paintings of rivers and water. For
                instance, the river&apos;s colours, such as the hazy sky, the sand-gold banks and a single
                red flag on the barge, are taken from Ilya Repin&apos;s{" "}
                <a href="https://en.wikipedia.org/wiki/Barge_Haulers_on_the_Volga" target="_blank" rel="noreferrer"><em>Barge
                Haulers on the Volga</em></a>, one of my favourite paintings. Similarly, the wind-blown
                blue-green water and its cream foam reference Repin&apos;s painting{" "}
                <a href="https://en.wikipedia.org/wiki/Ilya_Repin" target="_blank" rel="noreferrer"><em>What Freedom!</em></a></p>
              <p>As for the others, they are &lsquo;physical&rsquo; references, so see if you can find them!
                If you&apos;re stuck, press the spoiler button.</p>
              <ul className="river-how-source-list">
                {paintings.map((painting) => (
                  <li key={painting.label} className="river-how-source-item">
                    <a href={painting.href} target="_blank" rel="noreferrer" className="river-how-source-link">
                      {painting.label}
                    </a>
                    <details className="river-how-spoiler">
                      <summary>Spoiler</summary>
                      <p>{painting.description}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="river-how-section" aria-labelledby="river-how-music">
            <h2 id="river-how-music">Music</h2>
            <div className="river-how-copy">
              <p>The river plays Bedřich Smetana&apos;s <em>Vltava</em> (The Moldau), from <em>Má vlast</em>,
                performed by the Musopen Symphony Orchestra. The{" "}
                <a href="https://commons.wikimedia.org/wiki/File:Smetana,_M%C3%A1_vlast_-_Vltava_-_The_Moldau.ogg"
                  target="_blank" rel="noreferrer">recording is available under CC0</a>.
                Its volume has been evened out for quiet listening.</p>
              <p>Music and running water begin with your first tap or key press. Use the speaker
                button to turn sound off or on. Birds and rain are made in your browser as you walk.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
