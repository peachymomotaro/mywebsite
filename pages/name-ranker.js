import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const NAMES = [
  "Floating City",
  "Lightburst",
  "Invisible Worlds",
  "Lucid Dot",
  "Sequence Lab",
  "Elastic Horizon",
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeMatchups() {
  const pairs = [];
  for (let i = 0; i < NAMES.length; i += 1) {
    for (let j = i + 1; j < NAMES.length; j += 1) {
      pairs.push(Math.random() < 0.5 ? [i, j] : [j, i]);
    }
  }
  return shuffle(pairs);
}

export default function NameRanker() {
  const [voterName, setVoterName] = useState("");
  const [started, setStarted] = useState(false);
  const [matchups, setMatchups] = useState([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [comparisons, setComparisons] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState({ count: 0, ready: false, result: null });
  const [error, setError] = useState("");

  const total = 15;

  async function fetchStatus() {
    try {
      const response = await fetch("/api/name-ranker");
      if (!response.ok) return;
      const data = await response.json();
      setStatus(data);
    } catch {
      // A transient polling failure is not important enough to interrupt the UI.
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!submitted || status.ready) return undefined;
    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, [submitted, status.ready]);

  const currentPair = useMemo(
    () => (started && matchIndex < matchups.length ? matchups[matchIndex] : null),
    [started, matchIndex, matchups]
  );

  function startVoting(event) {
    event.preventDefault();
    const cleaned = voterName.trim();

    if (!cleaned) {
      setError("Please enter your name or initials.");
      return;
    }

    if (status.ready) {
      setError("Voting is already complete.");
      return;
    }

    setVoterName(cleaned);
    setMatchups(makeMatchups());
    setComparisons([]);
    setMatchIndex(0);
    setError("");
    setStarted(true);
  }

  function choose(winner, loser) {
    const next = [...comparisons, [winner, loser]];
    setComparisons(next);

    if (matchIndex + 1 === total) {
      submitBallot(next);
    } else {
      setMatchIndex((value) => value + 1);
    }
  }

  async function submitBallot(finalComparisons) {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/name-ranker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterName: voterName.trim(),
          comparisons: finalComparisons,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save your ballot.");
      }

      setStatus(data);
      setSubmitted(true);
      setStarted(false);
    } catch (err) {
      setError(err.message || "Could not save your ballot.");
      setStarted(false);
    } finally {
      setSubmitting(false);
    }
  }

  const progress = started ? Math.round((matchIndex / total) * 100) : 0;

  return (
    <>
      <Head>
        <title>Business Name Ranker — Peter Curry</title>
        <meta
          name="description"
          content="Pairwise ranking of six possible business names."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="ranker-page">
        <div className="ranker-topbar">
          <Link className="ranker-return-link" href="/projects">
            Return to my website
          </Link>
        </div>

        <section className="ranker-shell">
          <div className="ranker-card">
            <h1>Which name wins?</h1>
            <p className="intro">
              You’ll see every possible pair once, just pick the name you prefer each
              time.
            </p>

            {!started && !submitted && !status.ready ? (
              <form onSubmit={startVoting} className="start-form">
                <label htmlFor="voterName">Your name or initials</label>
                <input
                  id="voterName"
                  value={voterName}
                  onChange={(event) => setVoterName(event.target.value)}
                  autoComplete="name"
                  maxLength={50}
                  required
                />
                <button type="submit">Start ranking</button>
                <p className="small" aria-live="polite">
                  {status.count === 0
                    ? "No ballots submitted yet."
                    : `${status.count} of 3 ballots submitted.`}
                </p>
              </form>
            ) : null}

            {started && currentPair ? (
              <div className="vote">
                <div className="vote-meta">
                  <span>
                    Choice {matchIndex + 1} of {total}
                  </span>
                  <span>{progress}% complete</span>
                </div>

                <div className="progress" aria-hidden="true">
                  <div style={{ width: `${progress}%` }} />
                </div>

                <p className="prompt">Which do you prefer?</p>

                <div className="choices">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => choose(currentPair[0], currentPair[1])}
                  >
                    {NAMES[currentPair[0]]}
                  </button>

                  <div className="versus">or</div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => choose(currentPair[1], currentPair[0])}
                  >
                    {NAMES[currentPair[1]]}
                  </button>
                </div>
              </div>
            ) : null}

            {submitted && !status.ready ? (
              <div className="waiting" aria-live="polite">
                <h2>Ballot saved.</h2>
                <p>
                  {status.count} of 3 people have voted. This page will show the
                  consensus automatically when the final ballot arrives.
                </p>
              </div>
            ) : null}

            {status.ready && status.result ? (
              <Results result={status.result} />
            ) : null}

            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <style jsx>{`
        .ranker-page {
          --ranker-bg: #f8f5ef;
          --ranker-panel: #fffdf8;
          --ranker-text: #141414;
          --ranker-muted: #4b4b4b;
          --ranker-border: #e5e0d6;
          --ranker-accent: #1b4e7b;
          min-height: 100vh;
          padding: 24px 24px 72px;
          background: var(--ranker-bg);
          color: var(--ranker-text);
        }

        .ranker-topbar,
        .ranker-card {
          width: min(760px, 100%);
          margin: 0 auto;
        }

        .ranker-return-link {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--ranker-border);
          border-radius: 999px;
          background: var(--ranker-panel);
          color: var(--ranker-text);
          padding: 8px 12px;
          font-size: 0.9rem;
        }

        .ranker-return-link:hover {
          border-color: var(--ranker-text);
          color: var(--ranker-text);
        }

        .ranker-shell {
          min-height: calc(100vh - 128px);
          display: grid;
          place-items: center;
          padding: 42px 0 0;
        }

        .ranker-card {
          padding: clamp(28px, 5vw, 56px);
          border: 1px solid var(--ranker-border);
          border-radius: var(--radius);
          background: var(--ranker-panel);
          box-shadow: var(--shadow);
        }

        .eyebrow {
          margin-bottom: 12px;
          color: var(--ranker-muted);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.14em;
        }

        h1 {
          margin: 0 0 20px;
          color: var(--ranker-text);
          font-size: clamp(2.25rem, 7vw, 4.75rem);
          letter-spacing: -0.045em;
          line-height: 0.98;
        }

        h2 {
          margin: 0 0 12px;
          color: var(--ranker-text);
          font-size: 1.8rem;
        }

        p {
          color: var(--ranker-text);
        }

        .intro {
          max-width: 620px;
          color: var(--ranker-muted);
          font-size: 1.15rem;
          line-height: 1.6;
        }

        .start-form {
          max-width: 430px;
          display: grid;
          gap: 10px;
          margin-top: 40px;
        }

        label {
          font-weight: 600;
        }

        input {
          width: 100%;
          padding: 13px 14px;
          border: 1px solid var(--ranker-border);
          border-radius: 9px;
          background: var(--ranker-bg);
          color: var(--ranker-text);
          font: inherit;
        }

        button {
          font: inherit;
        }

        .start-form button {
          margin-top: 4px;
          padding: 13px 16px;
          border: 1px solid var(--ranker-text);
          border-radius: 9px;
          background: var(--ranker-text);
          color: var(--ranker-bg);
          cursor: pointer;
          font-weight: 700;
        }

        .start-form button:hover {
          background: var(--ranker-accent);
          border-color: var(--ranker-accent);
          color: var(--ranker-panel);
        }

        .small {
          margin-bottom: 0;
          color: var(--ranker-muted);
          font-size: 0.9rem;
          font-style: italic;
        }

        .vote {
          margin-top: 48px;
        }

        .vote-meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: var(--ranker-muted);
          font-size: 0.88rem;
        }

        .progress {
          height: 5px;
          overflow: hidden;
          margin: 9px 0 46px;
          border-radius: 100px;
          background: var(--ranker-border);
        }

        .progress div {
          height: 100%;
          background: var(--ranker-accent);
          transition: width 180ms ease;
        }

        .prompt {
          margin-bottom: 20px;
          color: var(--ranker-muted);
          font-size: 0.95rem;
          text-align: center;
        }

        .choices {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: stretch;
          gap: 14px;
        }

        .choices button {
          min-height: 180px;
          padding: 24px;
          border: 1px solid var(--ranker-border);
          border-radius: 16px;
          background: var(--ranker-bg);
          color: var(--ranker-text);
          cursor: pointer;
          font-size: clamp(1.25rem, 4vw, 2rem);
          font-weight: 600;
          letter-spacing: -0.025em;
          line-height: 1.08;
          transition: transform 100ms ease, background 100ms ease, border-color 100ms ease;
        }

        .choices button:hover {
          transform: translateY(-2px);
          border-color: var(--ranker-accent);
          background: var(--ranker-panel);
        }

        .choices button:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .versus {
          align-self: center;
          color: var(--ranker-muted);
          font-size: 0.85rem;
        }

        .waiting,
        .results {
          margin-top: 44px;
          padding-top: 34px;
          border-top: 1px solid var(--ranker-border);
        }

        .ranking {
          margin: 24px 0 0;
          padding: 0;
          list-style: none;
          counter-reset: rank;
        }

        .ranking li {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 10px;
          align-items: baseline;
          padding: 13px 0;
          border-bottom: 1px solid var(--ranker-border);
          counter-increment: rank;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .ranking li::before {
          content: counter(rank) ".";
          opacity: 0.45;
          font-variant-numeric: tabular-nums;
        }

        .agreement {
          margin-top: 22px;
          color: var(--ranker-muted);
          font-size: 0.95rem;
        }

        .tie-note {
          margin-top: 18px;
          padding: 14px 16px;
          border: 1px solid var(--ranker-border);
          border-radius: 10px;
        }

        .alternatives {
          margin-top: 10px;
          color: var(--ranker-muted);
          font-size: 0.92rem;
        }

        .error {
          margin-top: 22px;
          color: #a32d27;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .ranker-page {
            padding: 16px 14px 48px;
          }

          .ranker-shell {
            min-height: 0;
            padding-top: 28px;
          }

          .ranker-card {
            padding: 28px 20px;
          }

          .choices {
            grid-template-columns: 1fr;
          }

          .choices button {
            min-height: 120px;
          }

          .versus {
            justify-self: center;
          }
        }
      `}</style>
    </>
  );
}

NameRanker.hideSiteLayout = true;

function Results({ result }) {
  const primary = result.optimalRankings[0];

  return (
    <div className="results">
      <div className="eyebrow">CONSENSUS</div>
      <h2>Final ranking</h2>

      <ol className="ranking">
        {primary.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ol>

      <p className="agreement">
        This ordering agrees with <strong>{result.bestScore}</strong> of the{" "}
        <strong>{result.totalDecisions}</strong> individual head-to-head
        choices ({result.agreementPercent}%).
      </p>

      {result.optimalRankings.length > 1 ? (
        <div className="tie-note">
          <strong>
            There are {result.optimalRankings.length} equally good Kemeny
            rankings.
          </strong>
          <div className="alternatives">
            {result.optimalRankings.slice(0, 12).map((ranking, index) => (
              <div key={ranking.join("|")}>
                {index + 1}. {ranking.join(" › ")}
              </div>
            ))}
            {result.optimalRankings.length > 12 ? (
              <div>…and {result.optimalRankings.length - 12} more.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
