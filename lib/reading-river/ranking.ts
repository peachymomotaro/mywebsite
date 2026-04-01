export type RankableStatus = "unread" | "reading" | "done" | "not_now" | "archived";

export type RankableItem = {
  id: string;
  pinned: boolean;
  priorityScore: number;
  estimatedMinutes?: number | null;
  status: RankableStatus;
  createdAt: Date;
  suggestedRank?: number | null;
};

export type RankingConfig = {
  highPriorityThreshold: number;
  shortReadThresholdMinutes: number;
  excludeStatuses?: RankableStatus[];
  timeBudgetMinutes?: number;
};

const DEFAULT_EXCLUDED_STATUSES: RankableStatus[] = ["done", "archived", "not_now"];

function getEstimatedMinutes(item: RankableItem) {
  return item.estimatedMinutes ?? Number.POSITIVE_INFINITY;
}

function getQuadrant(item: RankableItem, config: RankingConfig) {
  const isHighPriority = item.priorityScore >= config.highPriorityThreshold;
  const isShortRead = getEstimatedMinutes(item) <= config.shortReadThresholdMinutes;

  if (isHighPriority && isShortRead) {
    return 1;
  }

  if (isHighPriority) {
    return 2;
  }

  if (isShortRead) {
    return 3;
  }

  return 4;
}

function compareNumbers(left: number, right: number) {
  return left - right;
}

function compareDates(left: Date, right: Date) {
  return compareNumbers(left.getTime(), right.getTime());
}

export function computeSuggestedOrder<T extends RankableItem>(items: T[], config: RankingConfig) {
  const excludedStatuses = new Set(config.excludeStatuses ?? DEFAULT_EXCLUDED_STATUSES);

  return items
    .filter((item) => !excludedStatuses.has(item.status))
    .filter((item) => {
      if (config.timeBudgetMinutes === undefined) {
        return true;
      }

      return item.estimatedMinutes !== undefined && item.estimatedMinutes !== null
        ? item.estimatedMinutes <= config.timeBudgetMinutes
        : false;
    })
    .slice()
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      const quadrantOrder = compareNumbers(getQuadrant(left, config), getQuadrant(right, config));

      if (quadrantOrder !== 0) {
        return quadrantOrder;
      }

      const priorityOrder = compareNumbers(right.priorityScore, left.priorityScore);

      if (priorityOrder !== 0) {
        return priorityOrder;
      }

      const readingTimeOrder = compareNumbers(getEstimatedMinutes(left), getEstimatedMinutes(right));

      if (readingTimeOrder !== 0) {
        return readingTimeOrder;
      }

      return compareDates(left.createdAt, right.createdAt);
    })
    .map((item, index) => ({
      ...item,
      suggestedRank: index + 1,
    }));
}
