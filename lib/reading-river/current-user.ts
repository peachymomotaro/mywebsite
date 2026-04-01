import { type User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName } from "@/lib/reading-river/auth";
import { getCurrentUserFromSessionToken } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";

const currentUserCache = new WeakMap<object, Promise<User | null>>();

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const cachedCurrentUser = currentUserCache.get(cookieStore as object);

  if (cachedCurrentUser) {
    return cachedCurrentUser;
  }

  const currentUserPromise = getCurrentUserFromSessionToken(
    cookieStore.get(getSessionCookieName())?.value,
  );

  currentUserCache.set(cookieStore as object, currentUserPromise);

  return currentUserPromise;
}

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
