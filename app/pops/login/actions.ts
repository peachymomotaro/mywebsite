"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkOwnerPassword, createPopsSession, getPopsCookieOptions, POPS_SESSION_COOKIE } from "@/lib/pops/auth";
import { safeNextPath } from "@/lib/pops/paths";
import { consumeRateLimit } from "@/lib/reading-river/rate-limit";

export type LoginState = { error: string | null };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";

  const limit = await consumeRateLimit({ name: "pops_login_ip_15m", key: ip, limit: 10, windowMs: 15 * 60_000 });
  if (!limit.allowed) return { error: "Too many attempts. Try again in a few minutes." };

  if (!(await checkOwnerPassword(password))) return { error: "Wrong password." };

  const token = await createPopsSession();
  (await cookies()).set(POPS_SESSION_COOKIE, token, getPopsCookieOptions());
  redirect(safeNextPath(formData.get("next")));
}
