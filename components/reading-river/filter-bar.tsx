const TIME_BUDGETS = ["5 min", "10 min", "15 min", "25 min", "45 min"];

type FilterBarProps = {
  manualOrderActive?: boolean;
};

export function FilterBar({ manualOrderActive = false }: FilterBarProps) {
  return (
    <section className="editorial-filter-bar">
      <div className="editorial-filter-stack">
        <div className="editorial-filter-band">
          <span className="editorial-filter-label text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
            Time available
          </span>
          <div className="editorial-filter-options">
            {TIME_BUDGETS.map((budget, index) => (
              <button
                key={budget}
                type="button"
                className={
                  index === 2
                    ? "rounded-full bg-[hsl(var(--accent))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                    : "rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-2.5 text-sm text-[hsl(var(--foreground))]"
                }
              >
                {budget}
              </button>
            ))}
          </div>
        </div>

        <div className="editorial-filter-band">
          <span className="editorial-filter-label text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
            Filters
          </span>
          <div className="editorial-filter-options">
            <span className="rounded-full bg-[hsl(var(--muted))] px-4 py-2 text-sm text-[hsl(var(--foreground))]">
              Unread
            </span>
            <span className="rounded-full bg-[hsl(var(--muted))] px-4 py-2 text-sm text-[hsl(var(--foreground))]">
              Pinned first
            </span>
            <span className="rounded-full bg-[hsl(var(--muted))] px-4 py-2 text-sm text-[hsl(var(--foreground))]">
              High priority
            </span>
            <span className="rounded-full bg-[hsl(var(--muted))] px-4 py-2 text-sm text-[hsl(var(--foreground))]">
              Not now hidden
            </span>
          </div>
        </div>

        {manualOrderActive ? (
          <div className="editorial-filter-band pt-2">
            <span className="editorial-filter-label text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
              Utility actions
            </span>
            <div className="editorial-filter-options">
              <button
                type="button"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] underline decoration-transparent underline-offset-4 transition hover:text-[hsl(var(--foreground))] hover:decoration-[hsl(var(--border))]"
              >
                Recalculate suggestion
              </button>
              <button
                type="button"
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] underline decoration-transparent underline-offset-4 transition hover:text-[hsl(var(--foreground))] hover:decoration-[hsl(var(--border))]"
              >
                Restore suggested order
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
