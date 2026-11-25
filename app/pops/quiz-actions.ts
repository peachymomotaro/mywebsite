"use server";

import { revalidatePath } from "next/cache";
import { isQuizMark, setQuizMark, setQuizPaperArchived } from "@/lib/pops/quiz";
import { requireOwner } from "@/lib/pops/session";

/** Called by the quiz player after each answer; returns rather than redirecting. */
export async function markQuizQuestionAction(questionId: string, mark: string | null) {
  await requireOwner();
  if (typeof questionId !== "string" || !questionId) return { ok: false as const, error: "Missing question." };
  if (mark !== null && !isQuizMark(mark)) return { ok: false as const, error: "Unknown mark." };
  try {
    await setQuizMark(questionId, mark);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save." };
  }
}

export async function archiveQuizPaperAction(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("paperId") ?? "");
  const archived = String(formData.get("archived") ?? "1") === "1";
  if (id) await setQuizPaperArchived(id, archived);
  revalidatePath("/pops/quiz");
}
