import { createBook } from "@/app/reading-river/actions/books";

export function BookForm() {
  async function submitBook(formData: FormData) {
    "use server";

    await createBook({
      title: String(formData.get("title") || "").trim(),
      author: String(formData.get("author") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    });
  }

  return (
    <section id="add-book" className="editorial-panel intake-panel">
      <div className="space-y-3">
        <p className="river-section-label">Book Roulette</p>
        <h3 className="text-[1.9rem] font-semibold tracking-tight">Add a book</h3>
        <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          Add one book to the roulette pool. It will stay separate from the article picks.
        </p>
      </div>

      <form action={submitBook} className="editorial-form book-form">
        <div className="book-form-row">
          <label className="book-form-field">
            <span>Title</span>
            <input
              name="title"
              type="text"
              required
              placeholder="Book title"
              className="intake-input"
            />
          </label>
          <label className="book-form-field">
            <span>Author</span>
            <input
              name="author"
              type="text"
              placeholder="Author"
              className="intake-input"
            />
          </label>
        </div>

        <label className="book-form-field">
          <span>Notes</span>
          <textarea
            name="notes"
            rows={4}
            placeholder="Why do you want to read this book?"
            className="intake-input intake-textarea book-form-notes"
          />
        </label>

        <div className="intake-submit-row">
          <button type="submit" className="intake-submit-button">
            Save book
          </button>
        </div>
      </form>
    </section>
  );
}
