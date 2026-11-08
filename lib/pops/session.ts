import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { POPS_SESSION_COOKIE, validatePopsSession } from "@/lib/pops/auth";
import { safeNextPath } from "@/lib/pops/paths";

/**
 * Every POps page and server action calls this. The proxy only checks that a
 * cookie is present; this is the authoritative database-backed check.
 */
export async function requireOwner(next?: string) {
  const token = (await cookies()).get(POPS_SESSION_COOKIE)?.value;
  const session = await validatePopsSession(token);
  if (!session) redirect(next ? `/pops/login?next=${encodeURIComponent(safeNextPath(next))}` : "/pops/login");
  return session;
}
