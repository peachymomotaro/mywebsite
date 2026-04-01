import {
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const DEFAULT_SESSION_COOKIE_NAME = "reading-river-session";
const LEGACY_SESSION_MARKER = "reading-river-authenticated";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

const scrypt = promisify(nodeScrypt);

function toHex(buffer: Uint8Array) {
  return Buffer.from(buffer).toString("hex");
}

function safeCompareText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function hashPassword(password: string) {
  if (!password) {
    throw new Error("Password must not be empty.");
  }

  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${toHex(salt)}$${toHex(derivedKey)}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!password || !passwordHash) {
    return false;
  }

  const [prefix, saltHex, derivedKeyHex, ...rest] = passwordHash.split("$");

  if (prefix !== PASSWORD_HASH_PREFIX || !saltHex || !derivedKeyHex || rest.length > 0) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedDerivedKey = Buffer.from(derivedKeyHex, "hex");
  const derivedKey = (await scrypt(password, salt, expectedDerivedKey.length)) as Buffer;

  if (expectedDerivedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedDerivedKey, derivedKey);
}

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function getLegacySessionPayload(expiresAt: number) {
  return `${LEGACY_SESSION_MARKER}:${expiresAt}`;
}

async function signLegacySessionValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function createSignedSessionForExpiry(secret: string, expiresAt: number) {
  const signature = await signLegacySessionValue(getLegacySessionPayload(expiresAt), secret);

  return `${expiresAt}.${signature}`;
}

export async function createSignedSession(secret: string, now = Date.now()) {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;

  return createSignedSessionForExpiry(secret, expiresAt);
}

export async function hasValidSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) {
    return false;
  }

  const [expiresAtRaw, signature, ...rest] = token.split(".");

  if (!expiresAtRaw || !signature || rest.length > 0) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || now > expiresAt) {
    return false;
  }

  const expectedToken = await createSignedSessionForExpiry(secret, expiresAt);

  return safeCompareText(token, expectedToken);
}
