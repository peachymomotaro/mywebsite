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

export async function updatePreferencesAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const digestCadence = parseDigestCadence(formData.get("digestCadence"));
  const includeBookRouletteInDigest = formData.get("includeBookRouletteInDigest") === "on";

  await getPrismaClient().appSettings.upsert({
    where: { userId: currentUser.id },
    update: {
      digestCadence,
      includeBookRouletteInDigest,
    },
    create: {
      ...getAppSettingsDefaults(currentUser.id),
      digestCadence,
      includeBookRouletteInDigest,
    },
  });

  revalidatePath(readingRiverPath("/preferences"));
  redirect(readingRiverPath("/preferences?saved=1"));
}
