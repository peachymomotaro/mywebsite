"use server";

import { redirect } from "next/navigation";
import { readingRiverPath } from "@/lib/reading-river/routes";

function normalizeInviteInput(value: string) {
  function normalizePath(path: string) {
    let normalizedPath = path.trim().replace(/^https?:\/\/[^/]+/i, "");
    normalizedPath = normalizedPath.replace(/^\/+|\/+$/g, "");

    if (normalizedPath.startsWith("reading-river/")) {
      normalizedPath = normalizedPath.slice("reading-river/".length);
    }

    if (normalizedPath.startsWith("invite/")) {
      return normalizedPath.slice("invite/".length) || null;
    }

    return normalizedPath || null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    const token = normalizePath(url.pathname);

    return token;
  } catch {
    return normalizePath(trimmedValue);
  }
}

export async function goToInviteRedemptionAction(formData: FormData) {
  const inviteValue = String(formData.get("invite") ?? "");
  const token = normalizeInviteInput(inviteValue);

  if (!token) {
    redirect(readingRiverPath("/invite?error=invalid_input"));
  }

  redirect(readingRiverPath(`/invite/${encodeURIComponent(token)}`));
}
