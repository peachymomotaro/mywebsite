"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, getSessionCookieOptions } from "@/lib/reading-river/auth";
import { redeemPasswordResetToken } from "@/lib/reading-river/password-resets";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { createSession } from "@/lib/reading-river/session";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token.trim() || !password.trim()) {
    redirect(
      readingRiverPath(`/reset-password/${encodeURIComponent(token)}?error=invalid_input`),
    );
  }

  const result = await redeemPasswordResetToken({
    token,
    password,
  });

  if (result.status !== "success") {
    redirect(
      readingRiverPath(`/reset-password/${encodeURIComponent(token)}?error=${result.status}`),
    );
  }

  const { token: sessionToken } = await createSession(result.user.id);
  const cookieStore = await cookies();

  cookieStore.set(getSessionCookieName(), sessionToken, getSessionCookieOptions());

  redirect(readingRiverPath());
}
