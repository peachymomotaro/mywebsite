import { type User } from "@prisma/client";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import { getCurrentUserFromSessionToken } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";

export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  return measureReadingRiverTiming("current-user.resolve", async () => {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;

    return getCurrentUserFromSessionToken(sessionToken);
  });
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(readingRiverPath("/login"));
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!user.isAdmin) {
    redirect(readingRiverPath("/login"));
  }

  return user;
}
