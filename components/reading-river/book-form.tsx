import { createBookWithChapters } from "@/app/reading-river/actions/books";
import { ChapterListEditor } from "@/components/reading-river/chapter-list-editor";

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

export function BookForm() {
  async function submitBook(formData: FormData) {
    "use server";

    const chapterTitles = formData.getAll("chapterTitle");
    const chapterMinutes = formData.getAll("chapterMinutes");

    await createBookWithChapters({
      title: String(formData.get("title") || "").trim(),
      author: String(formData.get("author") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      chapters: chapterTitles.map((chapterTitle, index) => ({
        title: String(chapterTitle || ""),
        estimatedMinutes: parseOptionalInteger(chapterMinutes[index] ?? null),
      })),
    });
  }

  return (
    <form action={submitBook} className="editorial-ledger-form">
      <div className="grid gap-8 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Title</span>
          <input
            name="title"
            type="text"
            required
            placeholder="Book title"
            className="border-0 border-b border-[hsl(var(--border))] bg-transparent px-0 py-3 text-base shadow-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-0"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Author</span>
          <input
            name="author"
            type="text"
            placeholder="Author"
            className="border-0 border-b border-[hsl(var(--border))] bg-transparent px-0 py-3 text-base shadow-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-0"
          />
        </label>
      </div>

      <label className="grid gap-3 text-sm">
        <span className="font-medium">Notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Anything you want to remember about this book"
          className="min-h-28 border-0 border-b border-[hsl(var(--border))] bg-transparent px-0 py-3 text-base shadow-none placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-0"
        />
      </label>

      <ChapterListEditor />

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="rounded-full border border-[hsl(var(--foreground))] px-6 py-3.5 text-sm font-medium text-[hsl(var(--foreground))]"
        >
          Save book
        </button>
      </div>
    </form>
  );
}
