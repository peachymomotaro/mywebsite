import { FilterBar } from "@/components/reading-river/filter-bar";
import { ReadingItemCard } from "@/components/reading-river/reading-item-card";

export type ReadingStreamItem = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  estimatedMinutes?: number | null;
  priorityScore: number;
  status: "unread" | "reading" | "done" | "not_now" | "archived";
  pinned: boolean;
  tags: string[];
};

type ReadingStreamProps = {
  items: ReadingStreamItem[];
  manualOrderActive?: boolean;
};

export function ReadingStream({ items, manualOrderActive = false }: ReadingStreamProps) {
  return (
    <section className="editorial-stream">
      {manualOrderActive ? (
        <div className="editorial-stream-state">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
            Order state
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--foreground))]">
            Manual order is currently shaping the stream.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            The queue stays responsive, but the reading order is being held with a lighter touch.
          </p>
        </div>
      ) : null}

      <div className="opacity-90">
        <FilterBar manualOrderActive={manualOrderActive} />
      </div>

      <ul className="editorial-stream-ledger divide-y divide-[hsl(var(--border))]/70">
        {items.length > 0 ? (
          items.map((item) => <ReadingItemCard key={item.id} {...item} />)
        ) : (
          <li className="py-10 text-[hsl(var(--muted-foreground))]">
            The stream is empty right now. Add a URL, a manual item, or a book chapter to start
            choosing from the river.
          </li>
        )}
      </ul>
    </section>
  );
}
