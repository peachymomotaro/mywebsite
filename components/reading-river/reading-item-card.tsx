type ReadingItemCardProps = {
  title: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  estimatedMinutes?: number | null;
  priorityScore: number;
  status: string;
  pinned: boolean;
  tags: string[];
};

export function ReadingItemCard({
  title,
  sourceUrl,
  siteName,
  estimatedMinutes,
  priorityScore,
  status,
  pinned,
  tags,
}: ReadingItemCardProps) {
  const content = (
    <>
      <div className="editorial-stream-copy">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
          <span>{siteName || "Manual entry"}</span>
          <span aria-hidden="true">•</span>
          <span className="capitalize">{status.replaceAll("_", " ")}</span>
          {pinned ? (
            <>
              <span aria-hidden="true">•</span>
              <span>Pinned</span>
            </>
          ) : null}
        </p>
        <h3 className="text-[2rem] font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-[2.15rem]">
          {title}
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          <span>Priority {priorityScore}</span>
          {tags.length > 0 ? (
            <>
              <span aria-hidden="true">•</span>
              <span>{tags.join(", ")}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="pt-1 text-left md:pl-8 md:pt-2 md:text-right">
        <span className="text-sm font-medium tabular-nums text-[hsl(var(--foreground))]">
          {estimatedMinutes ? `${estimatedMinutes} min` : "Time unknown"}
        </span>
      </div>
    </>
  );

  if (sourceUrl) {
    return (
      <li>
        <a
          href={sourceUrl}
          aria-label={title}
          className="editorial-stream-entry transition hover:bg-white/30"
        >
          {content}
        </a>
      </li>
    );
  }

  return (
    <li className="editorial-stream-entry">
      {content}
    </li>
  );
}
