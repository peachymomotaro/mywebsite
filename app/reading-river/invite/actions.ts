"use server";

import { redirect } from "next/navigation";
import { readingRiverPath } from "@/lib/reading-river/routes";

function normalizeInviteInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments[0] === "invite" && segments[1]) {
      return decodeURIComponent(segments[1]);
    }
  } catch {
    const normalizedPath = trimmedValue.replace(/^\/+|\/+$/g, "");

    if (normalizedPath.startsWith("invite/")) {
      return normalizedPath.slice("invite/".length) || null;
    }

    return normalizedPath;
  }

  return null;
}

export async function goToInviteRedemptionAction(formData: FormData) {
  const inviteValue = String(formData.get("invite") ?? "");
  const token = normalizeInviteInput(inviteValue);

  if (!token) {
    redirect(readingRiverPath("/invite?error=invalid_input"));
  }

  redirect(readingRiverPath(`/invite/${encodeURIComponent(token)}`));
}
