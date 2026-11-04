// The river: three reading possibilities drawn by simple weighted chance.
//
// Everything here is pure so the rules can be read, tested and tuned in one
// place. Storage and orchestration live in drift-store.ts.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const DRIFT_RULES = {
  itemCount: 3,
  /** Priority counts for this long after it was set or renewed. */
  priorityLifetimeDays: 14,
  /** Weight multiplier added per priority point (1–10). 10 → 5× as likely. */
  priorityWeightPerPoint: 0.4,
  /** An item surfaced today keeps this fraction of its chance… */
  recencyFloor: 0.25,
  /** …and recovers this much per day until it is back to full chance. */
  recencyRecoveryPerDay: 0.15,
  /** Unread appearances, on separate viewed days, before the first snooze. */
  missesBeforeFirstSnooze: 2,
  firstSnoozeDays: 3,
  /** After a snooze, one more unread return snoozes for this long. */
  repeatSnoozeDays: 7,
  /** Drifted-away items sit out of circulation for this long. */
  restHours: 20,
} as const;

export type DriftCandidate = {
  id: string;
  priorityScore: number | null;
  /** Null means "since creation" (intake sets priority when the item is added). */
  priorityAssignedAt: Date | null;
  createdAt: Date;
  lastSurfacedAt: Date | null;
  lastOpenedAt: Date | null;
  restingUntil: Date | null;
  snoozedUntil: Date | null;
  driftMisses: number;
  snoozeLevel: number;
};

export type Rng = () => number;

export function dayKeyFor(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayStart(dayKey: string) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function priorityExpiresAt(item: Pick<DriftCandidate, "priorityAssignedAt" | "createdAt">) {
  const assignedAt = item.priorityAssignedAt ?? item.createdAt;
  return new Date(assignedAt.getTime() + DRIFT_RULES.priorityLifetimeDays * DAY_MS);
}

/** Priority that still counts today; expired or absent priority counts as 0. */
export function effectivePriority(
  item: Pick<DriftCandidate, "priorityScore" | "priorityAssignedAt" | "createdAt">,
  now: Date,
) {
  if (item.priorityScore === null || item.priorityScore <= 0) return 0;
  if (priorityExpiresAt(item) <= now) return 0;
  return item.priorityScore;
}

export function recencyFactor(item: Pick<DriftCandidate, "lastSurfacedAt">, now: Date) {
  if (!item.lastSurfacedAt) return 1;
  const days = Math.max(0, Math.floor((dayStart(dayKeyFor(now)).getTime() -
    dayStart(dayKeyFor(item.lastSurfacedAt)).getTime()) / DAY_MS));
  return Math.min(1, DRIFT_RULES.recencyFloor + DRIFT_RULES.recencyRecoveryPerDay * days);
}

/** Always positive: every eligible item keeps some chance of surfacing. */
export function driftWeight(item: DriftCandidate, now: Date) {
  const priority = 1 + DRIFT_RULES.priorityWeightPerPoint * effectivePriority(item, now);
  return priority * recencyFactor(item, now);
}

export function isSnoozed(item: Pick<DriftCandidate, "snoozedUntil">, now: Date) {
  return item.snoozedUntil !== null && item.snoozedUntil > now;
}

export function isResting(item: Pick<DriftCandidate, "restingUntil">, now: Date) {
  return item.restingUntil !== null && item.restingUntil > now;
}

export function restUntil(now: Date) {
  return new Date(now.getTime() + DRIFT_RULES.restHours * HOUR_MS);
}

/** Weighted sampling without replacement. */
export function weightedSample<T>(items: T[], count: number, weight: (item: T) => number, rng: Rng) {
  const pool = items.map((item) => ({ item, weight: Math.max(weight(item), Number.EPSILON) }));
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let target = rng() * total;
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      target -= pool[index].weight;
      if (target < 0) break;
    }
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }

  return picked;
}

type DrawOptions<T extends DriftCandidate> = {
  candidates: T[];
  /** Items afloat already on the water; kept in place and never duplicated. */
  keep?: T[];
  /** Items just drifted away; used only when nothing else can fill a place. */
  avoid?: Set<string>;
  count?: number;
  now: Date;
  rng?: Rng;
};

/**
 * Fill the afloat. Fresh water first; then resting items; then, only when the
 * collection is too small for anything else, items that were just drifted.
 * Snoozed items never surface here.
 */
export function drawRiver<T extends DriftCandidate>({
  candidates,
  keep = [],
  avoid = new Set(),
  count = DRIFT_RULES.itemCount,
  now,
  rng = Math.random,
}: DrawOptions<T>) {
  const afloat = keep.slice(0, count);
  const taken = new Set(afloat.map((item) => item.id));
  const awake = candidates.filter((item) => !isSnoozed(item, now) && !taken.has(item.id));
  const tiers = [
    awake.filter((item) => !avoid.has(item.id) && !isResting(item, now)),
    awake.filter((item) => !avoid.has(item.id) && isResting(item, now)),
    awake.filter((item) => avoid.has(item.id)),
  ];

  for (const tier of tiers) {
    if (afloat.length >= count) break;
    afloat.push(...weightedSample(tier, count - afloat.length, (item) => driftWeight(item, now), rng));
  }

  return afloat;
}

export type SettlementPatch = {
  driftMisses: number;
  snoozeLevel: number;
  snoozedUntil?: Date;
};

/**
 * Called once per distinct earlier day on which the item sat, seen and
 * unread, in a selection that was still standing when the day ended.
 * Returns the new counters, or null if the item was opened since.
 */
export function settleUnreadAppearance(item: DriftCandidate, seenOn: string, now: Date): SettlementPatch | null {
  if (item.lastOpenedAt && item.lastOpenedAt >= dayStart(seenOn)) {
    return null;
  }

  const misses = item.driftMisses + 1;

  if (item.snoozeLevel === 0 && misses >= DRIFT_RULES.missesBeforeFirstSnooze) {
    return {
      driftMisses: 0,
      snoozeLevel: 1,
      snoozedUntil: new Date(now.getTime() + DRIFT_RULES.firstSnoozeDays * DAY_MS),
    };
  }

  if (item.snoozeLevel > 0) {
    return {
      driftMisses: 0,
      snoozeLevel: 2,
      snoozedUntil: new Date(now.getTime() + DRIFT_RULES.repeatSnoozeDays * DAY_MS),
    };
  }

  return { driftMisses: misses, snoozeLevel: item.snoozeLevel };
}

/** Opening, renewing priority or waking an item clears its unread history. */
export const clearedDriftHistory = { driftMisses: 0, snoozeLevel: 0, snoozedUntil: null } as const;
