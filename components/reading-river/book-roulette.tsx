import type { HomePageBook } from "@/lib/reading-river/homepage-data";

const DEFAULT_BOOK_NOTES =
  "Your notes about why you wanted to read this book would go here!";

type BookRouletteProps = {
  book: HomePageBook | null;
};

export function BookRoulette({ book }: BookRouletteProps) {
  const notes = book?.notes?.trim() || DEFAULT_BOOK_NOTES;

  return (
    <section className="river-book-roulette" aria-label="Book Roulette">
      <p className="river-section-label">Book Roulette</p>
      {book ? (
        <div className="river-book-roulette-pick">
          <span className="river-book-roulette-title" title={notes} tabIndex={0}>
            {book.title}
          </span>
          {book.author ? <span className="river-book-roulette-author">{book.author}</span> : null}
        </div>
      ) : (
        <p className="river-book-roulette-empty">Add a book to start roulette.</p>
      )}
    </section>
  );
}
