import FigureLesson from "./_components/figure-lesson";
import ThresholdLesson from "./_components/threshold-lesson";

export default function PreferenceCascades() {
  return (
    <article className="pc-page">
      <header className="pc-intro">
        <p className="small">Unlisted experiment</p>
        <h1>Preference cascades</h1>
        <p className="lead">People can privately want change while publicly going along with everyone else. If they start to expect more dissent, some may become willing to speak out.</p>
        <p>Timur Kuran’s <em>Private Truths, Public Lies</em> explores the gap between private preferences and public expression. Start with his diagram of how expectations settle, then try a small population where one changed threshold can set off a cascade.</p>
      </header>
      <FigureLesson />
      <ThresholdLesson />
      <section className="pc-definitions" aria-labelledby="pc-terms-heading">
        <h2 id="pc-terms-heading">Four things to keep apart</h2>
        <dl>
          <div><dt>Private preference</dt><dd>What someone actually wants. In the ten-person exercise, everyone privately favours change throughout.</dd></div>
          <div><dt>Public expression</dt><dd>What someone is willing to say openly. It can depend on how many others they expect to speak.</dd></div>
          <div><dt>Expected public dissent</dt><dd>The fraction people believe will speak out. This is the horizontal axis and the input to each round.</dd></div>
          <div><dt>Actual public dissent</dt><dd>The fraction willing to speak at that expectation. It becomes the next round’s expectation.</dd></div>
        </dl>
      </section>
      <footer className="pc-sources">
        <h2>Sources and assumptions</h2>
        <p>Inspired by <a href="https://www.atvbt.com/widget-help-request/">the Atoms vs Bits widget request</a> and Figure 4.3 in Timur Kuran’s <em>Private Truths, Public Lies</em> (1995). <a href="https://storage.ghost.io/c/37/79/3779c573-98d3-4e3f-93be-879da9f27ea6/content/images/2026/08/image-1.png">See the pictured diagram</a>.</p>
        <details>
          <summary>How the two models work</summary>
          <p>The first curve is a piecewise linear teaching approximation through (0, 30), (20, 35), (40, 40), (60, 52), (80, 70) and (100, 95). These are illustrative choices, not a formula or dataset supplied by Kuran. Between successive points, the curve is a straight line. Its only fixed point is 40%; every other expectation moves strictly towards it. Playback stops within 0.01 percentage points of 40%.</p>
          <p>The second model counts ten equally weighted people with initial thresholds [0, 20, 20, 30, 40, 50, 60, 70, 80, 90]%. A person speaks if their threshold is at or below the expected public dissent, including their own contribution. The resulting count divided by ten becomes everyone’s next expectation. Only the second person’s threshold and the initial expectation can be edited; the comparison keeps all other assumptions fixed.</p>
          <p>Updates are simultaneous, deterministic and reversible. There is no randomness, social network, changing private opinion or permanent commitment to speak. Neither model is an empirical estimate or forecast. The cascade exercise extends the theory; it is not what Figure 4.3 itself depicts.</p>
        </details>
      </footer>
    </article>
  );
}
