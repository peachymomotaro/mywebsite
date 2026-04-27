import type { DisplayMode } from "@prisma/client";
import { getPrismaClient } from "@/lib/reading-river/db";
import { computeSuggestedOrder } from "@/lib/reading-river/ranking";
import { getOrCreateAppSettings } from "@/lib/reading-river/settings";

type HomepageSourceItem = {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  estimatedMinutes?: number | null;
  priorityScore: number | null;
  status: "unread" | "reading" | "done" | "not_now" | "archived";
  pinned: boolean;
  manualRank?: number | null;
  suggestedRank?: number | null;
  createdAt: Date;
  readEvent?: {
    readAt: Date;
  } | null;
  tags?: Array<{
    tag: {
      name: string;
    };
  }>;
};

type HomepageBookSource = {
  id: string;
  title: string;
  author?: string | null;
  notes?: string | null;
  createdAt: Date;
};

type HomepageSettings = {
  displayMode: DisplayMode | "manual" | "suggested";
  manualOrderActive: boolean;
  highPriorityThreshold?: number;
  shortReadThresholdMinutes?: number;
  priorityRandomPoolSize?: number;
};

export type HomePageFeaturedItem = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  siteName?: string | null;
  estimatedMinutes?: number | null;
  priorityScore: number | null;
  status: "unread" | "reading" | "done" | "not_now" | "archived";
  pinned: boolean;
  tags: string[];
};

export type HomePageData = {
  priorityRead: HomePageFeaturedItem | null;
  streamRead: HomePageFeaturedItem | null;
  bookRoulettePick: HomePageBook | null;
  selectedTimeBudgetMinutes: number | null;
};

export type HomePageBook = {
  id: string;
  title: string;
  author?: string | null;
  notes?: string | null;
};

type HomePageDataOptions = {
  userId: string;
  dayKey?: string;
  now?: Date;
  timeBudgetMinutes?: number | null;
};

type BuildHomePageDataOptions = Omit<HomePageDataOptions, "userId"> & {
  books?: HomepageBookSource[];
};

type TimeBucket = {
  selectedMinutes: 5 | 10 | 15 | 30 | 45;
  minExclusive: number;
  maxInclusive: number;
};

const TIME_BUCKETS: TimeBucket[] = [
  { selectedMinutes: 5, minExclusive: 0, maxInclusive: 5 },
  { selectedMinutes: 10, minExclusive: 5, maxInclusive: 10 },
  { selectedMinutes: 15, minExclusive: 10, maxInclusive: 15 },
  { selectedMinutes: 30, minExclusive: 15, maxInclusive: 30 },
  { selectedMinutes: 45, minExclusive: 30, maxInclusive: 45 },
];

const DEFAULT_PRIORITY_RANDOM_POOL_SIZE = 3;

function toFeaturedItem(item: HomepageSourceItem): HomePageFeaturedItem {
  return {
    id: item.id,
    title: item.title,
    sourceUrl: item.sourceUrl,
    siteName: item.siteName,
    estimatedMinutes: item.estimatedMinutes,
    priorityScore: item.priorityScore,
    status: item.status,
    pinned: item.pinned,
    tags: item.tags?.map(({ tag }) => tag.name) ?? [],
  };
}

function getDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getSuggestedActiveItems(items: HomepageSourceItem[], settings: HomepageSettings) {
  return computeSuggestedOrder(
    items.filter(
      (item): item is HomepageSourceItem & { priorityScore: number } =>
        !item.readEvent && item.priorityScore !== null,
    ),
    {
      highPriorityThreshold: settings.highPriorityThreshold ?? 7,
      shortReadThresholdMinutes: settings.shortReadThresholdMinutes ?? 25,
    },
  );
}

function getArticleItems(items: HomepageSourceItem[]) {
  return items.filter((item) => item.sourceType !== "manual" && item.sourceType !== "book_chapter");
}

function matchesBucket(item: HomepageSourceItem, bucket: TimeBucket) {
  return item.estimatedMinutes !== null && item.estimatedMinutes !== undefined
    ? item.estimatedMinutes > bucket.minExclusive && item.estimatedMinutes <= bucket.maxInclusive
    : false;
}

function compareDatesAscending(left: Date, right: Date) {
  return left.getTime() - right.getTime();
}

function compareBucketPriority(left: HomepageSourceItem, right: HomepageSourceItem) {
  if (left.priorityScore !== right.priorityScore) {
    if (left.priorityScore === null) {
      return 1;
    }

    if (right.priorityScore === null) {
      return -1;
    }

    return right.priorityScore - left.priorityScore;
  }

  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  const leftMinutes = left.estimatedMinutes ?? Number.POSITIVE_INFINITY;
  const rightMinutes = right.estimatedMinutes ?? Number.POSITIVE_INFINITY;

  if (leftMinutes !== rightMinutes) {
    return leftMinutes - rightMinutes;
  }

  return compareDatesAscending(left.createdAt, right.createdAt);
}

function getBucketCandidates(items: HomepageSourceItem[]) {
  return items
    .filter((item) => (item.status === "unread" || item.status === "reading") && !item.readEvent)
    .slice()
    .sort(compareBucketPriority);
}

function getPriorityCandidates(items: HomepageSourceItem[]) {
  return getBucketCandidates(items).filter(
    (item): item is HomepageSourceItem & { priorityScore: number } => item.priorityScore !== null,
  );
}

function resolveBucketItems(
  items: HomepageSourceItem[],
  selectedTimeBudgetMinutes: number | null,
  settings: HomepageSettings,
) {
  if (selectedTimeBudgetMinutes === null) {
    return getSuggestedActiveItems(items, settings);
  }

  const selectedBucketIndex = TIME_BUCKETS.findIndex(
    (bucket) => bucket.selectedMinutes === selectedTimeBudgetMinutes,
  );

  if (selectedBucketIndex === -1) {
    return getSuggestedActiveItems(items, settings);
  }

  for (let index = selectedBucketIndex; index >= 0; index -= 1) {
    const bucketItems = getBucketCandidates(items).filter((item) => matchesBucket(item, TIME_BUCKETS[index]));

    if (bucketItems.length > 0) {
      return bucketItems;
    }
  }

  return [];
}

function resolveStreamItems(items: HomepageSourceItem[], selectedTimeBudgetMinutes: number | null) {
  if (selectedTimeBudgetMinutes === null) {
    return getBucketCandidates(items);
  }

  const selectedBucketIndex = TIME_BUCKETS.findIndex(
    (bucket) => bucket.selectedMinutes === selectedTimeBudgetMinutes,
  );

  if (selectedBucketIndex === -1) {
    return getBucketCandidates(items);
  }

  for (let index = selectedBucketIndex; index >= 0; index -= 1) {
    const bucketItems = getBucketCandidates(items).filter((item) => matchesBucket(item, TIME_BUCKETS[index]));

    if (bucketItems.length > 0) {
      return bucketItems;
    }
  }

  return [];
}

function pickDailyStreamItem(
  items: HomepageSourceItem[],
  dayKey: string,
  excludedId?: string,
) {
  const eligibleItems = items.filter((item) => item.id !== excludedId);

  if (eligibleItems.length === 0) {
    return null;
  }

  return eligibleItems
    .slice()
    .sort((left, right) => {
      const leftHash = hashString(`${dayKey}:${left.id}`);
      const rightHash = hashString(`${dayKey}:${right.id}`);

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return left.id.localeCompare(right.id);
    })[0];
}

function getPriorityRandomPoolSize(settings: HomepageSettings) {
  const configuredSize = settings.priorityRandomPoolSize ?? DEFAULT_PRIORITY_RANDOM_POOL_SIZE;

  return Math.max(1, Math.floor(configuredSize));
}

function pickPriorityItem(items: HomepageSourceItem[], dayKey: string, settings: HomepageSettings) {
  const randomPool = items.slice(0, getPriorityRandomPoolSize(settings));

  if (randomPool.length === 0) {
    return null;
  }

  return randomPool
    .slice()
    .sort((left, right) => {
      const leftHash = hashString(`${dayKey}:priority:${left.id}`);
      const rightHash = hashString(`${dayKey}:priority:${right.id}`);

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return left.id.localeCompare(right.id);
    })[0];
}

function pickDailyBook(books: HomepageBookSource[], dayKey: string) {
  if (books.length === 0) {
    return null;
  }

  return books
    .slice()
    .sort((left, right) => {
      const leftHash = hashString(`${dayKey}:${left.id}`);
      const rightHash = hashString(`${dayKey}:${right.id}`);

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return left.id.localeCompare(right.id);
    })[0];
}

function toHomePageBook(book: HomepageBookSource): HomePageBook {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    notes: book.notes,
  };
}

export function buildHomePageData(
  items: HomepageSourceItem[],
  settings: HomepageSettings,
  options: BuildHomePageDataOptions = {},
): HomePageData {
  const selectedTimeBudgetMinutes = options.timeBudgetMinutes ?? null;
  const dayKey = options.dayKey ?? getDayKey(options.now);
  const articleItems = getArticleItems(items);
  const suggestedItems = resolveBucketItems(
    getPriorityCandidates(articleItems),
    selectedTimeBudgetMinutes,
    settings,
  );
  const streamItems = resolveStreamItems(articleItems, selectedTimeBudgetMinutes);
  const priorityItem = pickPriorityItem(suggestedItems, dayKey, settings);
  const streamItem = pickDailyStreamItem(streamItems, dayKey, priorityItem?.id);
  const bookRoulettePick = pickDailyBook(options.books ?? [], dayKey);

  return {
    priorityRead: priorityItem ? toFeaturedItem(priorityItem) : null,
    streamRead: streamItem ? toFeaturedItem(streamItem) : null,
    bookRoulettePick: bookRoulettePick ? toHomePageBook(bookRoulettePick) : null,
    selectedTimeBudgetMinutes,
  };
}

export async function getHomePageData(options: HomePageDataOptions) {
  const prisma = getPrismaClient();
  const [settings, items, books] = await Promise.all([
    getOrCreateAppSettings(options.userId),
    prisma.readingItem.findMany({
      where: {
        userId: options.userId,
        status: {
          in: ["unread", "reading"],
        },
        readEvent: {
          is: null,
        },
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        sourceUrl: true,
        siteName: true,
        estimatedMinutes: true,
        priorityScore: true,
        status: true,
        pinned: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.book.findMany({
      where: {
        userId: options.userId,
      },
      select: {
        id: true,
        title: true,
        author: true,
        notes: true,
        createdAt: true,
      },
    }),
  ]);

  const { userId: _userId, ...restOptions } = options;

  return buildHomePageData(items, settings, { ...restOptions, books });
}
