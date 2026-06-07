"use client";

import { useEffect, useState } from "react";
import styles from "./qb.module.css";

const LAST_GENERATION_STORAGE_KEY = "qb-reader:last-generation";

type SavedGeneration = {
  query: string;
  output: string;
  savedAt: string;
};

export default function QBPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [cards, setCards] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_GENERATION_STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as SavedGeneration;

      if (parsed.output) {
        setCards(parsed.output);
      }

      if (parsed.query) {
        setQuery(parsed.query);
      }

      if (parsed.savedAt) {
        setLastSavedAt(parsed.savedAt);
      }
    } catch {
      window.localStorage.removeItem(LAST_GENERATION_STORAGE_KEY);
    }
  }, []);

  async function searchQB() {
    console.log("Searching QBReader for:", query);
    setLoading(true);
    setCards("");
    setResults([]);

    const response = await fetch(`/api/qb?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    const foundResults = data.tossups || [];

    setResults(foundResults);

    if (!foundResults.length) {
      setCards(
        "No QBReader results found. Try a broader search term or alternate spelling."
      );
    }

    setLoading(false);
  }

  async function extractCards() {
    if (!results.length) {
      setCards("No QBReader results found, so no cards were generated.");
      return;
    }

    setExtracting(true);

    const response = await fetch("/api/qb/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        questions: results,
      }),
    });

    const data = await response.json();
    const output = data.output ?? "No cards were generated.";

    setCards(output);

    const savedGeneration: SavedGeneration = {
      query,
      output,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      LAST_GENERATION_STORAGE_KEY,
      JSON.stringify(savedGeneration)
    );

    setLastSavedAt(savedGeneration.savedAt);
    setExtracting(false);
  }

  function clearSavedGeneration() {
    setCards("");
    setLastSavedAt("");
    window.localStorage.removeItem(LAST_GENERATION_STORAGE_KEY);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Canon
          <br />
          Explorer
        </h1>
      </header>

      <section className={styles.controls}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a QBReader search term (e.g. 'Shakespeare')"
          className={styles.input}
        />

        <button type="button" onClick={searchQB} className={styles.buttonBlue}>
          {loading ? "Searching..." : "Search"}
        </button>

        <button
          type="button"
          onClick={extractCards}
          disabled={!results.length || extracting}
          className={styles.buttonRed}
        >
          {extracting ? "Writing..." : "Extract Cards"}
        </button>
      </section>

      {cards && (
        <section className={styles.cards}>
          <h2 className={styles.cardsTitle}>Generated Cards</h2>

          {lastSavedAt && (
            <p>
              Last saved: {new Date(lastSavedAt).toLocaleString()}
            </p>
          )}

          <div>{cards}</div>

          <button
            type="button"
            onClick={clearSavedGeneration}
            className={styles.buttonBlue}
          >
            Clear saved generation
          </button>
        </section>
      )}

      {results.length > 0 && (
        <p className={styles.count}>
          Found {results.length} QBReader result
          {results.length === 1 ? "" : "s"}
        </p>
      )}

      <section>
        {results.map((question) => (
          <article key={question._id} className={styles.result}>
            <div className={styles.meta}>
              {question.set?.year} • {question.set?.name}
            </div>

            <p className={styles.question}>
              {question.question_sanitized}
            </p>

            <div className={styles.answer}>
              {question.answer_sanitized}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}