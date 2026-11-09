import { RiverDrift } from "@/components/reading-river/river-drift";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getDriftViews } from "@/lib/reading-river/drift-store";
import { getEddyArticles } from "@/lib/reading-river/eddies";
import { getForestArticles } from "@/lib/reading-river/forest";
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
    // Every time budget's stream is drawn together, so switching time swaps
    // already-fetched pieces rather than making another round trip.
    const [driftViews, eddies, forest] = await Promise.all([
      getDriftViews(currentUser.id),
      getEddyArticles(currentUser.id),
      getForestArticles(currentUser.id),
    ]);

    return (
      <main className="river-home-page glade-home">
        <RiverDrift
          initialMinutes={selectedTimeBudgetMinutes}
          views={driftViews}
          eddies={eddies}
          forest={forest}
        />
      </main>
    );
  });
}
