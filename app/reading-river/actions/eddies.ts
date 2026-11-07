"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { markAsRead } from "./reading-items";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { EddyError, setEddyMembership, withEddyTransaction } from "@/lib/reading-river/eddies";
import type { EddyActionState } from "@/lib/reading-river/eddy-state";
import { readingRiverItemEditPath, readingRiverPath } from "@/lib/reading-river/routes";
import { readingItemIdSchema } from "@/lib/reading-river/validators/reading-item";

export async function changeEddyArticle(
  id: string,
  operation: "add" | "remove" | "read",
  _previousState: EddyActionState,
  _formData: FormData,
): Promise<EddyActionState> {
  try {
    const user = await requireCurrentUser();
    const itemId = readingItemIdSchema.parse(id);
    // Server Action arguments are untrusted, even when bound by a component.
    if (!["add", "remove", "read"].includes(operation)) throw new EddyError("Unknown article action.");
    let drifted: string | null = null;
    if (operation === "read") {
      await markAsRead({ id: itemId });
    } else {
      const change = await withEddyTransaction(user.id, (tx) => setEddyMembership(tx, user.id, itemId, operation === "add"));
      drifted = change.drifted?.title ?? null;
    }
    revalidatePath(readingRiverPath());
    revalidatePath(readingRiverItemEditPath(itemId));
    const message = operation === "add"
      ? drifted ? `Kept in the eddies. "${drifted}" drifted back into the river.` : "Kept in the eddies."
      : operation === "read" ? "Marked as read." : "Let back into the river.";
    return { status: "success", message };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: error instanceof EddyError ? error.message : "Couldn't update that article. Try again." };
  }
}
