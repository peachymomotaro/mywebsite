import { createHmac, timingSafeEqual } from "node:crypto";
import { getReadingRiverHomeUrl } from "./public-url";

type DigestArticle = { userId: string; itemId: string };

function signature(payload: string, secret: string) {
  // Domain separation: this capability cannot be used as a cron credential
  // or as another type of signed Reading River link.
  return createHmac("sha256", secret).update(`reading-river:digest-article:v1:${payload}`).digest();
}

/** A narrow capability to open one recipient's article; never a login token. */
export function createDigestArticleToken(userId: string, itemId: string) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET must be set before building digest article links.");
  const payload = Buffer.from(JSON.stringify({ userId, itemId })).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("hex")}`;
}

export function readDigestArticleToken(token: string | null): DigestArticle | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !token || token.length > 2048) return null;
  const [payload, signed, ...rest] = token.split(".");
  if (!payload || !signed || rest.length || !/^[a-f0-9]{64}$/.test(signed)) return null;
  if (!timingSafeEqual(signature(payload, secret), Buffer.from(signed, "hex"))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof value?.userId !== "string" || !value.userId || typeof value?.itemId !== "string" || !value.itemId) return null;
    return { userId: value.userId, itemId: value.itemId };
  } catch {
    return null;
  }
}

export function getDigestArticleUrl(userId: string, itemId: string) {
  const url = new URL("/api/reading-river/digest-click", getReadingRiverHomeUrl());
  url.searchParams.set("token", createDigestArticleToken(userId, itemId));
  return url.toString();
}
