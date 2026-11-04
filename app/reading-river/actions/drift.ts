"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { letDriftOn, noteDriftSeen, putBackInRiver, renewPriority, wakeSnoozed } from "@/lib/reading-river/drift-store";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { TIME_BUDGET_SELECTIONS, getTimeBudgetKey } from "@/lib/reading-river/time-budgets";
import { readingItemIdSchema } from "@/lib/reading-river/validators/reading-item";

const budgetKeySchema = z.enum(TIME_BUDGET_SELECTIONS.map(getTimeBudgetKey) as [string, ...string[]])
  .transform((key) => key as ReturnType<typeof getTimeBudgetKey>);

// Drifting on returns the new afloat directly and deliberately does not
// revalidate: the rest of the page should stay exactly as it is.
export async function letDriftOnAction(budgetKey: string) {
  const user = await requireCurrentUser();
  return letDriftOn(user.id, budgetKeySchema.parse(budgetKey));
}

/** "Not now" for a single item: it drifts off and another takes its place. */
export async function letOneDriftOnAction(budgetKey: string, id: string) {
  const user = await requireCurrentUser();
  return letDriftOn(user.id, budgetKeySchema.parse(budgetKey), { onlyId: readingItemIdSchema.parse(id) });
}

export async function noteDriftSeenAction(budgetKey: string, ids: string[]) {
  const user = await requireCurrentUser();
  const parsedIds = z.array(readingItemIdSchema).max(3).parse(ids);
  await noteDriftSeen(user.id, budgetKeySchema.parse(budgetKey), parsedIds);
}

export async function renewPriorityAction(id: string) {
  const user = await requireCurrentUser();
  await renewPriority(user.id, readingItemIdSchema.parse(id));
  revalidatePath(readingRiverPath());
}

export async function wakeSnoozedAction() {
  const user = await requireCurrentUser();
  await wakeSnoozed(user.id);
  revalidatePath(readingRiverPath());
}

export async function putBackInRiverAction(id: string) {
  const user = await requireCurrentUser();
  await putBackInRiver(user.id, readingItemIdSchema.parse(id));
  revalidatePath(readingRiverPath());
}
