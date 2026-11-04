import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/reading-river/db";
import {
  clearedDriftHistory,
  dayKeyFor,
  drawRiver,
  effectivePriority,
  isSnoozed,
  restUntil,
  settleUnreadAppearance,
  type DriftCandidate,
  type Rng,
} from "@/lib/reading-river/drift";
import {
  getTimeBudgetKey,
  TIME_BUDGET_SELECTIONS,
  type TimeBudgetKey,
} from "@/lib/reading-river/time-budgets";

export type DriftDraw = { ids: string[]; drawnOn: string; seenIds: string[] };
export type DriftDraws = Partial<Record<TimeBudgetKey, DriftDraw>>;

const candidateSelect = {
  id: true,
  title: true,
  sourceUrl: true,
  siteName: true,
  estimatedMinutes: true,
  priorityScore: true,
  priorityAssignedAt: true,
  createdAt: true,
  lastSurfacedAt: true,
  lastOpenedAt: true,
  restingUntil: true,
  snoozedUntil: true,
  driftMisses: true,
  snoozeLevel: true,
  eddySlot: true,
  tags: { select: { tag: { select: { name: true } } } },
} satisfies Prisma.ReadingItemSelect;

type StoredCandidate = Prisma.ReadingItemGetPayload<{ select: typeof candidateSelect }>;

export type RiverItem = {
  id: string;
  title: string;
  sourceUrl: string | null;
  siteName: string | null;
  estimatedMinutes: number | null;
  tags: string[];
  inEddies: boolean;
  hasPriority: boolean;
  priorityFaded: boolean;
};

export type DriftView = {
  afloat: RiverItem[];
  /** Everything that could currently surface for this budget. */
  inCirculation: number;
  /** Items temporarily snoozed after unread returns. */
  snoozed: number;
  nextReturn: string | null;
  /** True when a drift could not find anything new. */
  stillWater?: boolean;
};

export type DriftViews = Record<TimeBudgetKey, DriftView>;

function toRiverItem(item: StoredCandidate, now: Date): RiverItem {
  return {
    id: item.id,
    title: item.title,
    sourceUrl: item.sourceUrl,
    siteName: item.siteName,
    estimatedMinutes: item.estimatedMinutes,
    tags: item.tags.map(({ tag }) => tag.name),
    inEddies: item.eddySlot !== null,
    hasPriority: effectivePriority(item, now) > 0,
    priorityFaded: item.priorityScore !== null && effectivePriority(item, now) === 0,
  };
}

/** Within the budget, if one is chosen. Unknown lengths fit only "any time". */
export function fitsBudget(item: { estimatedMinutes: number | null }, key: TimeBudgetKey) {
  if (key === "any") return true;
  return item.estimatedMinutes !== null && item.estimatedMinutes <= Number(key);
}

function loadCandidates(tx: Prisma.TransactionClient, userId: string) {
  // The eddies are a curated list already on the page, so the river draws
  // from everything else that is unread.
  return tx.readingItem.findMany({
    where: {
      userId,
      status: { in: ["unread", "reading"] },
      readEvent: { is: null },
      sourceType: { notIn: ["manual", "book_chapter"] },
      eddySlot: null,
      // Items lifted onto the bank (opened, not yet finished) stay out of
      // the water until they are read or put back.
      NOT: { status: "reading", lastOpenedAt: { not: null } },
    },
    select: candidateSelect,
  });
}

function parseDraws(value: Prisma.JsonValue | undefined): DriftDraws {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const draws: DriftDraws = {};
  for (const key of TIME_BUDGET_SELECTIONS.map(getTimeBudgetKey)) {
    const raw = (value as Record<string, unknown>)[key] as Partial<DriftDraw> | undefined;
    if (raw && Array.isArray(raw.ids) && typeof raw.drawnOn === "string") {
      draws[key] = {
        ids: raw.ids.filter((id): id is string => typeof id === "string"),
        drawnOn: raw.drawnOn,
        seenIds: Array.isArray(raw.seenIds) ? raw.seenIds.filter((id): id is string => typeof id === "string") : [],
      };
    }
  }
  return draws;
}

/**
 * Selections from earlier days that were looked at count as one unread
 * appearance per item per day. Unseen or drifted-away afloat never count.
 */
export function collectStaleAppearances(draws: DriftDraws, today: string) {
  const daysById = new Map<string, Set<string>>();
  for (const draw of Object.values(draws)) {
    if (!draw || draw.drawnOn >= today) continue;
    for (const id of draw.seenIds) {
      if (!draw.ids.includes(id)) continue;
      const days = daysById.get(id) ?? new Set<string>();
      days.add(draw.drawnOn);
      daysById.set(id, days);
    }
  }
  return daysById;
}

function summarise(items: StoredCandidate[], key: TimeBudgetKey, now: Date) {
  const inBudget = items.filter((item) => fitsBudget(item, key));
  const snoozed = inBudget.filter((item) => isSnoozed(item, now));
  const nextReturn = snoozed
    .map((item) => item.snoozedUntil!)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return {
    inBudget,
    inCirculation: inBudget.length - snoozed.length,
    snoozed: snoozed.length,
    nextReturn: nextReturn ? nextReturn.toISOString() : null,
  };
}

function withDriftTransaction<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return getPrismaClient().$transaction(async (tx) => {
    // Serialise drift writes per user so two tabs cannot both settle a day.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE`;
    return operation(tx);
  }, { timeout: 10_000 });
}

/**
 * The selection for every time budget. Items afloat already on the water today stay
 * put; only gaps (read, removed, snoozed items) are filled.
 */
export async function getDriftViews(userId: string, options: { now?: Date; rng?: Rng } = {}) {
  const now = options.now ?? new Date();
  const today = dayKeyFor(now);

  return withDriftTransaction(userId, async (tx) => {
    const [state, loaded] = await Promise.all([
      tx.driftState.findUnique({ where: { userId } }),
      loadCandidates(tx, userId),
    ]);
    let items = loaded;
    const draws = parseDraws(state?.draws);
    let changed = false;

    // A new day: settle yesterday's looked-at afloat before drawing again.
    const stale = collectStaleAppearances(draws, today);
    if (stale.size > 0) {
      const byId = new Map(items.map((item) => [item.id, item]));
      for (const [id, days] of stale) {
        let item: StoredCandidate | undefined = byId.get(id);
        if (!item) continue;
        for (const day of Array.from(days).sort()) {
          const patch = settleUnreadAppearance(item, day, now);
          if (patch) item = { ...item, ...patch };
        }
        if (item !== byId.get(id)) {
          await tx.readingItem.update({
            where: { userId_id: { userId, id } },
            data: { driftMisses: item.driftMisses, snoozeLevel: item.snoozeLevel, snoozedUntil: item.snoozedUntil },
          });
          byId.set(id, item);
        }
      }
      items = Array.from(byId.values());
    }

    const views = {} as DriftViews;
    const byId = new Map(items.map((item) => [item.id, item]));

    for (const minutes of TIME_BUDGET_SELECTIONS) {
      const key = getTimeBudgetKey(minutes);
      const summary = summarise(items, key, now);
      const previous = draws[key];
      const keep = previous && previous.drawnOn === today
        ? previous.ids
          .map((id) => byId.get(id))
          .filter((item): item is StoredCandidate =>
            item !== undefined && fitsBudget(item, key) && !isSnoozed(item, now))
        : [];
      const afloat = drawRiver({ candidates: summary.inBudget, keep, now, rng: options.rng });
      const ids = afloat.map((item) => item.id);

      if (!previous || previous.drawnOn !== today || ids.join() !== previous.ids.join()) {
        draws[key] = {
          ids,
          drawnOn: today,
          seenIds: previous?.drawnOn === today ? previous.seenIds.filter((id) => ids.includes(id)) : [],
        };
        changed = true;
      }

      views[key] = {
        afloat: afloat.map((item) => toRiverItem(item, now)),
        inCirculation: summary.inCirculation,
        snoozed: summary.snoozed,
        nextReturn: summary.nextReturn,
      };
    }

    if (changed) {
      await tx.driftState.upsert({
        where: { userId },
        create: { userId, draws: draws as Prisma.InputJsonValue },
        update: { draws: draws as Prisma.InputJsonValue },
      });
    }

    return views;
  });
}

type DriftOnOptions = { now?: Date; rng?: Rng; onlyId?: string };

/**
 * Let them drift on: rest the current afloat (no penalty, priority untouched) and draw
 * fresh ones. With onlyId, just that one item drifts away and is replaced.
 */
export async function letDriftOn(userId: string, key: TimeBudgetKey, options: DriftOnOptions = {}) {
  const now = options.now ?? new Date();
  const today = dayKeyFor(now);

  return withDriftTransaction(userId, async (tx) => {
    const [state, items] = await Promise.all([
      tx.driftState.findUnique({ where: { userId } }),
      loadCandidates(tx, userId),
    ]);
    const draws = parseDraws(state?.draws);
    const byId = new Map(items.map((item) => [item.id, item]));
    const summary = summarise(items, key, now);
    const current = draws[key]?.drawnOn === today ? draws[key]!.ids : [];
    const leaving = options.onlyId ? current.filter((id) => id === options.onlyId) : current;
    const staying = current
      .filter((id) => !leaving.includes(id))
      .map((id) => byId.get(id))
      .filter((item): item is StoredCandidate => item !== undefined && fitsBudget(item, key) && !isSnoozed(item, now));

    if (leaving.length > 0) {
      const restingUntil = restUntil(now);
      await tx.readingItem.updateMany({ where: { userId, id: { in: leaving } }, data: { restingUntil } });
      for (const id of leaving) {
        const item = byId.get(id);
        if (item) byId.set(id, { ...item, restingUntil });
      }
    }

    const candidates = summary.inBudget.map((item) => byId.get(item.id)!);
    const afloat = drawRiver({ candidates, keep: staying, avoid: new Set(leaving), now, rng: options.rng });
    const ids = afloat.map((item) => item.id);
    // Keep the steady afloat where they were; new ones take the empty places.
    const ordered = [
      ...current.map((id) => (ids.includes(id) && !leaving.includes(id) ? id : null)),
    ];
    const fresh = ids.filter((id) => !ordered.includes(id));
    const placed = ordered.map((id) => id ?? fresh.shift() ?? null).filter((id): id is string => id !== null);
    placed.push(...fresh);

    const previous = draws[key];
    draws[key] = {
      ids: placed,
      drawnOn: today,
      // Items afloat that stayed keep their "seen" mark; drifted ones lose it, so
      // drifting on never counts as an unread appearance.
      seenIds: previous?.drawnOn === today ? previous.seenIds.filter((id) => placed.includes(id) && !leaving.includes(id)) : [],
    };

    await tx.driftState.upsert({
      where: { userId },
      create: { userId, draws: draws as Prisma.InputJsonValue },
      update: { draws: draws as Prisma.InputJsonValue },
    });

    const afloatItems = placed.map((id) => byId.get(id)!);
    const view: DriftView = {
      afloat: afloatItems.map((item) => toRiverItem(item, now)),
      inCirculation: summary.inCirculation,
      snoozed: summary.snoozed,
      nextReturn: summary.nextReturn,
      // Nothing new could be found: the whole collection is already here.
      stillWater: leaving.length > 0 && placed.every((id) => current.includes(id)),
    };
    return view;
  });
}

/** The afloat stayed on screen long enough to count as looked at. */
export async function noteDriftSeen(userId: string, key: TimeBudgetKey, ids: string[], now = new Date()) {
  const today = dayKeyFor(now);

  return withDriftTransaction(userId, async (tx) => {
    const state = await tx.driftState.findUnique({ where: { userId } });
    const draws = parseDraws(state?.draws);
    const draw = draws[key];
    if (!draw || draw.drawnOn !== today) return;

    const newlySeen = ids.filter((id) => draw.ids.includes(id) && !draw.seenIds.includes(id));
    if (newlySeen.length === 0) return;

    draw.seenIds.push(...newlySeen);
    await tx.driftState.update({ where: { userId }, data: { draws: draws as Prisma.InputJsonValue } });
    await tx.readingItem.updateMany({
      where: { userId, id: { in: newlySeen } },
      data: { lastSurfacedAt: now },
    });
  });
}

/**
 * Following a river item's link lifts it onto the bank: it becomes "still
 * reading", leaves the water and stays findable on later days until it is
 * marked read or put back. Its unread history is cleared.
 */
export async function noteDriftOpened(userId: string, id: string, now = new Date()) {
  const prisma = getPrismaClient();
  await prisma.readingItem.updateMany({
    where: { userId, id, status: { in: ["unread", "reading"] }, readEvent: { is: null } },
    data: { status: "reading", lastOpenedAt: now, restingUntil: null, ...clearedDriftHistory },
  });
}

/** Put a still-reading item back in the water, as ordinary unread. */
export function putBackInRiver(userId: string, id: string) {
  return getPrismaClient().readingItem.updateMany({
    where: { userId, id, status: "reading" },
    data: { status: "unread", restingUntil: null },
  });
}

const bankSelect = {
  id: true,
  title: true,
  sourceUrl: true,
  siteName: true,
  estimatedMinutes: true,
  priorityScore: true,
  priorityAssignedAt: true,
  createdAt: true,
  eddySlot: true,
  lastOpenedAt: true,
  lastSurfacedAt: true,
  tags: { select: { tag: { select: { name: true } } } },
} satisfies Prisma.ReadingItemSelect;

export type BankItem = RiverItem & { openedAt: string | null; surfacedAt: string | null };

export type RiverBank = {
  /** Opened from the river and not yet finished, newest first. */
  stillReading: BankItem[];
  /** Drifted past in the last week and not currently afloat or in hand. */
  recentlyPassed: BankItem[];
};

const RECENTLY_PASSED_DAYS = 7;
const BANK_LIMIT = 6;

/**
 * Nothing that drifts by is lost: whatever you opened sits on the bank, and
 * the last week's passers can be found again from the same page.
 */
export async function getRiverBank(userId: string, afloatIds: string[], now = new Date()): Promise<RiverBank> {
  const prisma = getPrismaClient();
  const active = {
    userId,
    readEvent: { is: null },
    sourceType: { notIn: ["manual", "book_chapter"] as Array<"manual" | "book_chapter"> },
  };
  const [stillReading, recentlyPassed] = await Promise.all([
    prisma.readingItem.findMany({
      where: { ...active, status: "reading", lastOpenedAt: { not: null } },
      orderBy: { lastOpenedAt: "desc" },
      take: BANK_LIMIT,
      select: bankSelect,
    }),
    prisma.readingItem.findMany({
      where: {
        ...active,
        status: "unread",
        id: { notIn: afloatIds },
        lastSurfacedAt: { gte: new Date(now.getTime() - RECENTLY_PASSED_DAYS * 86_400_000) },
      },
      orderBy: { lastSurfacedAt: "desc" },
      take: BANK_LIMIT,
      select: bankSelect,
    }),
  ]);

  const toBankItem = (item: (typeof stillReading)[number]): BankItem => ({
    id: item.id,
    title: item.title,
    sourceUrl: item.sourceUrl,
    siteName: item.siteName,
    estimatedMinutes: item.estimatedMinutes,
    tags: item.tags.map(({ tag }) => tag.name),
    inEddies: item.eddySlot !== null,
    hasPriority: effectivePriority(item, now) > 0,
    priorityFaded: item.priorityScore !== null && effectivePriority(item, now) === 0,
    openedAt: item.lastOpenedAt?.toISOString() ?? null,
    surfacedAt: item.lastSurfacedAt?.toISOString() ?? null,
  });

  return { stillReading: stillReading.map(toBankItem), recentlyPassed: recentlyPassed.map(toBankItem) };
}

/** Explicit renewal restarts the fourteen days; it also clears snoozing. */
export function renewPriority(userId: string, id: string, now = new Date()) {
  return getPrismaClient().readingItem.updateMany({
    where: { userId, id, priorityScore: { not: null } },
    data: { priorityAssignedAt: now, ...clearedDriftHistory },
  });
}

/** Bring every snoozed item back early (used by the all-snoozed state). */
export function wakeSnoozed(userId: string) {
  return getPrismaClient().readingItem.updateMany({
    where: { userId, snoozedUntil: { not: null } },
    data: { snoozedUntil: null, driftMisses: 0 },
  });
}
