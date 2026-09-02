import Head from "next/head";
import { useEffect, useState } from "react";
import {
  celebrityDeadOrAliveEntries,
  type CelebrityDeadOrAliveEntry,
} from "../data/celebrityDeadOrAlive";
import styles from "../styles/CelebrityDeadOrAlive.module.css";

type Guess = "alive" | "dead";

function shuffledEntries() {
  const copy = [...celebrityDeadOrAliveEntries];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function lifeLine(entry: CelebrityDeadOrAliveEntry) {
  if (entry.isAlive) {
    return `Born ${entry.birthYear} · Age ${entry.age}`;
  }

  return `${entry.birthYear}–${entry.deathYear} · Died aged ${entry.age}`;
}

function CelebrityDeadOrAlivePage() {
  const [entries, setEntries] = useState(celebrityDeadOrAliveEntries);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setEntries(shuffledEntries());
  }, []);

  const current = entries[index];
  const answered = guess !== null;
  const guessedAlive = guess === "alive";
  const isCorrect = answered && guessedAlive === current.isAlive;

  function choose(nextGuess: Guess) {
    if (answered) return;

    const correct = (nextGuess === "alive") === current.isAlive;
    setGuess(nextGuess);

    if (correct) {
      setScore((value) => value + 1);
      setStreak((value) => value + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (index >= entries.length - 1) {
      setFinished(true);
      return;
    }

    setIndex((value) => value + 1);
    setGuess(null);
  }

  function restart() {
    setEntries(shuffledEntries());
    setIndex(0);
    setGuess(null);
    setScore(0);
    setStreak(0);
    setFinished(false);
  }

  return (
    <>
      <Head>
        <title>Celebrity Dead or Alive</title>
        <meta
          name="description"
          content="Celebrity Dead or Alive: decide whether a familiar face is still with us."
        />
        <meta name="robots" content="noindex,nofollow,noarchive" />
        <meta name="googlebot" content="noindex,nofollow,noarchive" />
      </Head>

      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.masthead}>
            <p className={styles.eyebrow}>Celebrity</p>
            <h1 className={styles.title}>Dead or Alive</h1>
            <div className={styles.rule} aria-hidden="true">
              <span className={styles.diamond} />
            </div>
            <p className={styles.subtitle}>
              One face. Two choices. Decide whether they’re still alive before the
              answer is revealed.
            </p>
          </header>

          {!finished ? (
            <>
              <div className={styles.scorebar} aria-label="Game score">
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Score</span>
                  <span className={styles.statValue}>
                    {score}/{index + (answered ? 1 : 0)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Streak</span>
                  <span className={styles.statValue}>{streak}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Card</span>
                  <span className={styles.statValue}>
                    {index + 1}/{entries.length}
                  </span>
                </div>
              </div>

              <article className={styles.card}>
                <div className={styles.cardInner}>
                  <p className={styles.prompt}>Dead or alive?</p>

                  <figure>
                    <div className={styles.portraitFrame}>
                      <img
                        className={styles.portrait}
                        src={current.imageSrc}
                        alt={current.imageAlt}
                      />
                    </div>
                    {current.imageCredit ? (
                      <figcaption className={styles.credit}>
                        Photo: {current.imageCredit.label} ·{" "}
                        <a
                          href={current.imageCredit.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {current.imageCredit.license}
                        </a>
                      </figcaption>
                    ) : null}
                  </figure>

                  <h2 className={styles.name}>{current.name}</h2>

                  <div className={styles.choices}>
                    <button
                      className={`${styles.choice} ${styles.alive}`}
                      type="button"
                      onClick={() => choose("alive")}
                      disabled={answered}
                    >
                      Alive
                    </button>
                    <button
                      className={`${styles.choice} ${styles.dead}`}
                      type="button"
                      onClick={() => choose("dead")}
                      disabled={answered}
                    >
                      Dead
                    </button>
                  </div>

                  {answered ? (
                    <section className={styles.reveal} aria-live="polite">
                      <p
                        className={`${styles.verdict} ${
                          isCorrect ? styles.correct : styles.incorrect
                        }`}
                      >
                        {isCorrect ? "Correct" : "Not quite"}
                      </p>
                      <p className={styles.answer}>
                        {current.isAlive ? "Alive" : "Dead"} — {lifeLine(current)}
                      </p>
                      <p className={styles.detail}>{current.knownFor}</p>
                      <button className={styles.nextButton} type="button" onClick={next}>
                        {index === entries.length - 1 ? "See score" : "Next face"}
                      </button>
                    </section>
                  ) : null}
                </div>
              </article>
            </>
          ) : (
            <article className={styles.card}>
              <div className={styles.finished}>
                <p className={styles.finishedKicker}>That’s the lot</p>
                <h2 className={styles.finishedTitle}>Final score</h2>
                <p className={styles.finalScore}>
                  <strong>{score}</strong> out of <strong>{entries.length}</strong>
                </p>
                <p className={styles.finalNote}>
                  Think you know who’s still kicking? Shuffle the deck and try again.
                </p>
                <button className={styles.restartButton} type="button" onClick={restart}>
                  Play again
                </button>
              </div>
            </article>
          )}

          <p className={styles.footerNote}>
            Starter data only — the full deck will use locally stored Wikimedia Commons
            portraits with attribution.
          </p>
        </div>
      </main>
    </>
  );
}

CelebrityDeadOrAlivePage.hideSiteLayout = true;

export default CelebrityDeadOrAlivePage;
