"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { getAppSettingsDefaults } from "@/lib/reading-river/settings";

function parseDigestCadence(value: FormDataEntryValue | null) {
  const candidate = String(value ?? "").trim();

  switch (candidate) {
    case "daily":
    case "every_other_day":
    case "weekly":
    case "monthly":
    case "seasonal":
    case "off":
      return candidate;
    default:
      return "off";
  }
}

function parsePriorityRandomPoolSize(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(Math.max(parsed, 1), 20);
}

export async function updatePreferencesAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const digestCadence = parseDigestCadence(formData.get("digestCadence"));
  const includeBookRouletteInDigest = formData.get("includeBookRouletteInDigest") === "on";
  const priorityRandomPoolSize = parsePriorityRandomPoolSize(
    formData.get("priorityRandomPoolSize"),
  );

  await getPrismaClient().appSettings.upsert({
    where: { userId: currentUser.id },
    update: {
      digestCadence,
      includeBookRouletteInDigest,
      priorityRandomPoolSize,
    },
    create: {
      ...getAppSettingsDefaults(currentUser.id),
      digestCadence,
      includeBookRouletteInDigest,
      priorityRandomPoolSize,
    },
  });

  revalidatePath(readingRiverPath("/preferences"));
  redirect(readingRiverPath("/preferences?saved=1"));
}
