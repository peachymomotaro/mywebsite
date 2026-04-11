"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getPrismaClient } from "@/lib/reading-river/db";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { getAppSettingsDefaults } from "@/lib/reading-river/settings";

export async function updatePreferencesAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const enabled = String(formData.get("dailyDigestEnabled") ?? "") === "on";

  await getPrismaClient().appSettings.upsert({
    where: { userId: currentUser.id },
    update: { dailyDigestEnabled: enabled },
    create: {
      ...getAppSettingsDefaults(currentUser.id),
      dailyDigestEnabled: enabled,
    },
  });

  revalidatePath(readingRiverPath("/preferences"));
  redirect(readingRiverPath("/preferences?saved=1"));
}
