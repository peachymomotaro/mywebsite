import { HomeReadCard } from "@/components/reading-river/home-read-card";
import { TimeBudgetPicker, parseTimeBudgetSearchParam } from "@/components/reading-river/time-budget-picker";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getHomePageData } from "@/lib/reading-river/homepage-data";
import { readingRiverPath } from "@/lib/reading-river/routes";

export const dynamic = "force-dynamic";

type ReadingRiverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function ReadingRiverPage({ searchParams }: ReadingRiverPageProps = {}) {
  const currentUser = await requireCurrentUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedTimeBudgetMinutes = parseTimeBudgetSearchParam(resolvedSearchParams.time);
  const data = await getHomePageData({
    userId: currentUser.id,
    timeBudgetMinutes: selectedTimeBudgetMinutes,
  });

  return (
    <main className="river-page">
      <section className="river-home-hero">
        <div className="river-home-hero-copy">
          <h1 className="river-home-title">Pick your next read</h1>
        </div>

        <a href={readingRiverPath("/add")} className="river-primary-action">
          Add to stream
        </a>
      </section>

      <section className="river-spotlight-grid">
        <HomeReadCard
          label="Next priority read"
          item={data.priorityRead}
          emptyMessage="Add something to the stream to get a recommendation."
        />
        <HomeReadCard
          label="From the stream"
          item={data.streamRead}
          emptyMessage="Add another item to unlock a daily stream pick."
        />
      </section>

      <TimeBudgetPicker selectedMinutes={data.selectedTimeBudgetMinutes} />
    </main>
  );
}
