"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { HomePageBook } from "@/lib/reading-river/homepage-data";

const DEFAULT_BOOK_NOTES =
  "Your notes about why you wanted to read this book would go here!";

type BookRouletteProps = {
  book: HomePageBook | null;
  books?: HomePageBook[];
  removeAction?: (formData: FormData) => Promise<void>;
};

function pickAnotherBook(books: HomePageBook[], currentBookId?: string) {
  const candidates = books.filter((book) => book.id !== currentBookId);

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function BookRoulette({ book, books = [], removeAction }: BookRouletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBook, setSelectedBook] = useState<HomePageBook | null>(book);
  const notesId = useId();

  const rouletteBooks = useMemo(() => {
    if (books.length > 0) {
      return books;
    }

    return book ? [book] : [];
  }, [book, books]);

  useEffect(() => {
    setSelectedBook(book);
  }, [book?.id, book]);

  const notes = selectedBook?.notes?.trim() || DEFAULT_BOOK_NOTES;
  const canPickAnotherBook = rouletteBooks.length > 1;

  function handlePickAnotherBook() {
    const nextBook = pickAnotherBook(rouletteBooks, selectedBook?.id);

    if (!nextBook) {
      return;
    }

    setSelectedBook(nextBook);
    setIsExpanded(true);
  }

  return (
    <section className="river-book-roulette" aria-label="Book Roulette">
      <p className="river-section-label">Book Roulette</p>
      {selectedBook ? (
        <div className="river-book-roulette-selection">
          <div className="river-book-roulette-pick">
            <button
              className="river-book-roulette-title"
              type="button"
              aria-expanded={isExpanded}
              aria-controls={notesId}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {selectedBook.title}
            </button>
            {selectedBook.author ? (
              <span className="river-book-roulette-author">{selectedBook.author}</span>
            ) : null}
          </div>

          {isExpanded ? (
            <div className="river-book-roulette-details" id={notesId}>
              <p className="river-book-roulette-notes">{notes}</p>

              <div className="river-book-roulette-detail-actions">
                {canPickAnotherBook ? (
                  <button
                    type="button"
                    className="river-spotlight-action-button river-book-roulette-another"
                    onClick={handlePickAnotherBook}
                  >
                    Another random book
                  </button>
                ) : null}

                {removeAction ? (
                  <form action={removeAction}>
                    <input type="hidden" name="bookId" value={selectedBook.id} />
                    <button
                      type="submit"
                      className="river-spotlight-action-button river-spotlight-action-danger river-book-roulette-remove"
                    >
                      Remove book
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="river-book-roulette-empty">Add a book to start roulette.</p>
      )}
    </section>
  );
}