"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, getSessionCookieOptions } from "@/lib/reading-river/auth";
import { redeemInvite } from "@/lib/reading-river/invites";
import { createSession } from "@/lib/reading-river/session";
import { readingRiverPath } from "@/lib/reading-river/routes";

export async function redeemInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  if (!token.trim() || !password.trim()) {
    redirect(readingRiverPath(`/invite/${encodeURIComponent(token)}?error=invalid_input`));
  }

  const result = await redeemInvite({
    token,
    password,
    displayName,
  });

  if (result.status !== "success") {
    redirect(readingRiverPath(`/invite/${encodeURIComponent(token)}?error=${result.status}`));
  }

  const { token: sessionToken } = await createSession(result.user.id);
  const cookieStore = await cookies();

  cookieStore.set(getSessionCookieName(), sessionToken, getSessionCookieOptions());

  redirect(readingRiverPath());
}
