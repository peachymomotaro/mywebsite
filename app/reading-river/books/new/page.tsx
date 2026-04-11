import { BookForm } from "@/components/reading-river/book-form";

export default function NewBookPage() {
  return (
    <main className="editorial-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <p className="editorial-page-intro">Book ledger</p>
          </div>
        </header>
        <hr className="editorial-page-rule" />

        <section className="editorial-page-content">
          <header className="max-w-4xl space-y-6">
            <p className="text-sm uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
              Ledger entry
            </p>
            <h1 className="editorial-page-title font-semibold">Add book</h1>
            <p className="editorial-page-intro">
              Split a book into chapters so each part can live in the stream as its own readable
              unit.
            </p>
          </header>

          <BookForm />
        </section>
      </div>
    </main>
  );
}
