"use client";

import { useId, useState } from "react";
import type { HomePageBook } from "@/lib/reading-river/homepage-data";

const DEFAULT_BOOK_NOTES =
  "Your notes about why you wanted to read this book would go here!";

type BookRouletteProps = {
  book: HomePageBook | null;
};

export function BookRoulette({ book }: BookRouletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const notesId = useId();
  const notes = book?.notes?.trim() || DEFAULT_BOOK_NOTES;

  return (
    <section className="river-book-roulette" aria-label="Book Roulette">
      <p className="river-section-label">Book Roulette</p>
      {book ? (
        <div className="river-book-roulette-selection">
          <div className="river-book-roulette-pick">
            <button
              className="river-book-roulette-title"
              type="button"
              aria-expanded={isExpanded}
              aria-controls={notesId}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {book.title}
            </button>
            {book.author ? <span className="river-book-roulette-author">{book.author}</span> : null}
          </div>
          {isExpanded ? (
            <p className="river-book-roulette-notes" id={notesId}>
              {notes}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="river-book-roulette-empty">Add a book to start roulette.</p>
      )}
    </section>
  );
}
