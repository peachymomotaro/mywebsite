"use server";

import { UserStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSessionCookieName,
  getSessionCookieOptions,
  verifyPassword,
} from "@/lib/reading-river/auth";
import { getPrismaClient } from "@/lib/reading-river/db";
import { createSession } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";

function redirectWithError(error: "invalid_credentials" | "account_disabled"): never {
  return redirect(readingRiverPath(`/login?error=${error}`));
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectWithError("invalid_credentials");
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    redirectWithError("invalid_credentials");
  }

  if (user.status !== UserStatus.active) {
    redirectWithError("account_disabled");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    redirectWithError("invalid_credentials");
  }

  const { token } = await createSession(user.id);
  const cookieStore = await cookies();

  cookieStore.set(getSessionCookieName(), token, getSessionCookieOptions());

  redirect(readingRiverPath());
}
