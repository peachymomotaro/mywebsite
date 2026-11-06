import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "@/lib/reading-river/auth";
import { getPopsDb } from "@/lib/pops/db";

export const POPS_SESSION_COOKIE = "pops_session";
export const POPS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function safeEqualText(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b) && left.length === right.length;
}

export type PasswordConfig =
  | { kind: "hash"; value: string }
  | { kind: "plain"; value: string; legacy: boolean }
  | { kind: "missing" };

export function getPasswordConfig(env: Record<string, string | undefined> = process.env): PasswordConfig {
  if (env.POPS_PASSWORD_HASH) return { kind: "hash", value: env.POPS_PASSWORD_HASH };
  if (env.POPS_PASSWORD) return { kind: "plain", value: env.POPS_PASSWORD, legacy: false };
  // Continuity with the retired QB login: the same password keeps working
  // until POPS_PASSWORD_HASH is configured.
  if (env.QB_PASSWORD) return { kind: "plain", value: env.QB_PASSWORD, legacy: true };
  return { kind: "missing" };
}

export async function checkOwnerPassword(
  candidate: string,
  config: PasswordConfig = getPasswordConfig(),
) {
  if (!candidate || config.kind === "missing") return false;
  if (config.kind === "hash") return verifyPassword(candidate, config.value);
  return safeEqualText(candidate, config.value);
}

export function getPopsCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: POPS_SESSION_MAX_AGE_SECONDS,
  };
}

/** Creates a server-side session. Only the SHA-256 of the token is stored. */
export async function createPopsSession(now = new Date()) {
  const token = createOpaqueToken();
  await getPopsDb().popsSession.create({
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + POPS_SESSION_MAX_AGE_SECONDS * 1000),
      lastUsedAt: now,
    },
  });
  return token;
}

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export async function validatePopsSession(token: string | undefined, now = new Date()) {
  if (!token || token.length > 200) return null;
  const db = getPopsDb();
  const session = await db.popsSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.popsSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });
  }
  return session;
}

export async function revokePopsSession(token: string | undefined, now = new Date()) {
  if (!token) return;
  await getPopsDb().popsSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: now },
  });
}
