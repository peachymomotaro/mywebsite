import { AddItemTabs } from "@/components/reading-river/add-item-tabs";
import { BookForm } from "@/components/reading-river/book-form";
import { UrlIntakeForm } from "@/components/reading-river/url-intake-form";
import { getKnownTagNames } from "@/lib/reading-river/known-tags";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export default async function AddPage() {
  return measureReadingRiverTiming("page.reading-river-add.render", async () => {
    const knownTagNames = await getKnownTagNames();

    return (
      <main className="river-page">
        <section className="max-w-4xl space-y-4">
          <h1 className="river-home-title">Add to stream</h1>
          <p className="editorial-page-intro">
            Save a link as an article, or add a book to the separate Book Roulette pool.
          </p>
        </section>

        <AddItemTabs
          articleContent={<UrlIntakeForm knownTagNames={knownTagNames} />}
          bookContent={<BookForm />}
        />
      </main>
    );
  });
}
