import Link from "next/link";
import { deleteBook } from "@/app/reading-river/actions/books";
import { BookRoulette } from "@/components/reading-river/book-roulette";
import { HomeReadCard } from "@/components/reading-river/home-read-card";
import {
  HomeSpotlights,
  type HomeSpotlightCards,
} from "@/components/reading-river/home-spotlights";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getHomePageDataForBudgets } from "@/lib/reading-river/homepage-data";
import { readingRiverPath } from "@/lib/reading-river/routes";
import {
  getTimeBudgetKey,
  parseTimeBudgetSearchParam,
  TIME_BUDGET_SELECTIONS,
} from "@/lib/reading-river/time-budgets";
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
    const dataByBudget = await getHomePageDataForBudgets({ userId: currentUser.id });
    const data = dataByBudget[getTimeBudgetKey(selectedTimeBudgetMinutes)];

    // Render the six possible spotlight pairs once. Selecting a time budget
    // then swaps already-fetched cards rather than making another round trip.
    const cards = {} as HomeSpotlightCards;
    for (const minutes of TIME_BUDGET_SELECTIONS) {
      const pair = dataByBudget[getTimeBudgetKey(minutes)];
      cards[getTimeBudgetKey(minutes)] = {
        priority: (
          <HomeReadCard
            label="Next priority read"
            item={pair.priorityRead}
            emptyMessage="Add something to the stream to get a recommendation."
          />
        ),
        stream: (
          <HomeReadCard
            label="From the stream"
            item={pair.streamRead}
            emptyMessage="Add another item to unlock a daily stream pick."
          />
        ),
      };
    }

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

        <HomeSpotlights initialMinutes={selectedTimeBudgetMinutes} cards={cards} />

        <BookRoulette
          book={data.bookRoulettePick}
          books={data.bookRouletteBooks}
          removeAction={removeBookRoulettePickAction}
        />
      </main>
    );
  });
}
