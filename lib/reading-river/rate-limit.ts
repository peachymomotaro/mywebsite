import { createHash } from "node:crypto";
import { getPrismaClient } from "@/lib/reading-river/db";

export const RATE_LIMITS = {
  URL_FETCHES_PER_USER_PER_DAY: 100,
  FAILED_LOGIN_ATTEMPTS_PER_EMAIL_IP_PER_15_MIN: 5,
  PASSWORD_RESETS_PER_EMAIL_PER_HOUR: 3,
  ITEM_CREATES_PER_USER_PER_DAY: 300,
} as const;

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type RateLimitResult = {
  allowed: boolean;
  name: string;
  limit: number;
  count: number;
  windowStart?: Date;
};

export class RateLimitExceededError extends Error {
  result: RateLimitResult;

  constructor(result: RateLimitResult) {
    super("rate_limit_exceeded");
    this.name = "RateLimitExceededError";
    this.result = result;
  }
}

export function isRateLimitExceededError(error: unknown): error is RateLimitExceededError {
  return error instanceof RateLimitExceededError;
}

function hashRateLimitKey(key: string) {
  return createHash("sha256").update(key.trim().toLowerCase()).digest("hex");
}

function getWindowStart(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export async function consumeRateLimit({
  name,
  key,
  limit,
  windowMs,
  now = new Date(),
}: {
  name: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<RateLimitResult> {
  const windowStart = getWindowStart(now, windowMs);
  const hashedKey = hashRateLimitKey(key);
  const prisma = getPrismaClient();
  const rateLimitBucket = (prisma as ReturnType<typeof getPrismaClient> & {
    rateLimitBucket?: {
      upsert: (args: unknown) => Promise<{ count: number }>;
    };
  }).rateLimitBucket;

  if (!rateLimitBucket) {
    return {
      allowed: true,
      name,
      limit,
      count: 0,
      windowStart,
    };
  }

  const bucket = await rateLimitBucket.upsert({
    where: {
      name_key_windowStart: {
        name,
        key: hashedKey,
        windowStart,
      },
    },
    create: {
      name,
      key: hashedKey,
      windowStart,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
    select: {
      count: true,
    },
  });

  return {
    allowed: bucket.count <= limit,
    name,
    limit,
    count: bucket.count,
    windowStart,
  };
}

export function consumeUrlFetchRateLimit(userId: string) {
  return consumeRateLimit({
    name: "url_fetch_user_day",
    key: userId,
    limit: RATE_LIMITS.URL_FETCHES_PER_USER_PER_DAY,
    windowMs: ONE_DAY_MS,
  });
}

export function consumeItemCreateRateLimit(userId: string) {
  return consumeRateLimit({
    name: "item_create_user_day",
    key: userId,
    limit: RATE_LIMITS.ITEM_CREATES_PER_USER_PER_DAY,
    windowMs: ONE_DAY_MS,
  });
}

export function consumeFailedLoginRateLimit({
  email,
  ipAddress,
}: {
  email: string;
  ipAddress: string;
}) {
  return consumeRateLimit({
    name: "failed_login_email_ip_15m",
    key: `${email}|${ipAddress}`,
    limit: RATE_LIMITS.FAILED_LOGIN_ATTEMPTS_PER_EMAIL_IP_PER_15_MIN,
    windowMs: 15 * 60_000,
  });
}

export function consumePasswordResetRateLimit(email: string) {
  return consumeRateLimit({
    name: "password_reset_email_hour",
    key: email,
    limit: RATE_LIMITS.PASSWORD_RESETS_PER_EMAIL_PER_HOUR,
    windowMs: ONE_HOUR_MS,
  });
}
