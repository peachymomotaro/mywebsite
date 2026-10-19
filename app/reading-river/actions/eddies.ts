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
    if (operation === "read") {
      await markAsRead({ id: itemId });
    } else {
      await withEddyTransaction(user.id, (tx) => setEddyMembership(tx, user.id, itemId, operation === "add"));
    }
    revalidatePath(readingRiverPath());
    revalidatePath(readingRiverItemEditPath(itemId));
    return { status: "success", message: operation === "add" ? "Kept in the eddies." : operation === "read" ? "Marked as read." : "Removed from the eddies." };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: error instanceof EddyError ? error.message : "Couldn't update that article. Try again." };
  }
}
