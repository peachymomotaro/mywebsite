import { EddiesSection } from "@/components/reading-river/eddies-section";
import { getEddyArticles } from "@/lib/reading-river/eddies";
import Link from "next/link";
import { deleteBook } from "@/app/reading-river/actions/books";
import { BookRoulette } from "@/components/reading-river/book-roulette";
import { RiverDrift } from "@/components/reading-river/river-drift";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getHomePageData } from "@/lib/reading-river/homepage-data";
import { getDriftViews, getRiverBank } from "@/lib/reading-river/drift-store";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { parseTimeBudgetSearchParam } from "@/lib/reading-river/time-budgets";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export const dynamic = "force-dynamic";

type ReadingRiverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReadingRiverPage({ searchParams }: ReadingRiverPageProps) {
  return measureReadingRiverTiming("page.reading-river-home.render", async () => {
    const currentUser = await requireCurrentUser();
    const resolvedSearchParams = (await searchParams) ?? {};
    const selectedTimeBudgetMinutes = parseTimeBudgetSearchParam(resolvedSearchParams.time);
    // Every time budget's afloat are drawn together, so switching time swaps
    // already-fetched afloat rather than making another round trip.
    const [driftViews, eddies, data] = await Promise.all([
      getDriftViews(currentUser.id),
      getEddyArticles(currentUser.id),
      getHomePageData({ userId: currentUser.id }),
    ]);
    const afloatIds = Object.values(driftViews).flatMap((view) => view.afloat.map((item) => item.id));
    const bank = await getRiverBank(currentUser.id, afloatIds);

    async function removeBookRoulettePickAction(formData: FormData) {
      "use server";

      const bookId = String(formData.get("bookId") || "").trim();
      if (!bookId) return;

      await deleteBook({ id: bookId });
    }

    return (
      <main className="river-home-page">
        <section className="river-home-hero">
          <div className="river-home-hero-copy">
            <h1 className="river-home-title">Pick your next read</h1>
          </div>
          <Link href={readingRiverPath("/add")} className="river-primary-action">
            Add to stream
          </Link>
        </section>

        <RiverDrift initialMinutes={selectedTimeBudgetMinutes} views={driftViews} bank={bank} />

        <EddiesSection items={eddies} />

        <BookRoulette
          book={data.bookRoulettePick}
          books={data.bookRouletteBooks}
          removeAction={removeBookRoulettePickAction}
        />
      </main>
    );
  });
}
