import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/reading-river/auth";
import { createExtensionToken } from "@/lib/reading-river/extension-auth";
import { getPrismaClient } from "@/lib/reading-river/db";
import { consumeFailedLoginRateLimit } from "@/lib/reading-river/rate-limit";
import { hashSecurityValue, logSecurityEvent } from "@/lib/reading-river/security-log";

function invalidCredentials() {
  return NextResponse.json(
    {
      error: "invalid_credentials",
    },
    {
      status: 401,
    },
  );
}

function accountDisabled() {
  return NextResponse.json(
    {
      error: "account_disabled",
    },
    {
      status: 403,
    },
  );
}

function getClientIpAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function recordFailedLogin(email: string, request: Request) {
  const ipAddress = getClientIpAddress(request);
  const result = await consumeFailedLoginRateLimit({ email, ipAddress });

  if (!result.allowed) {
    logSecurityEvent(
      "rate_limit_hit",
      {
        limitName: result.name,
        emailHash: hashSecurityValue(email),
        ipHash: hashSecurityValue(ipAddress),
        count: result.count,
        limit: result.limit,
      },
      "warn",
    );
    logSecurityEvent(
      "repeated_failed_login_burst",
      {
        emailHash: hashSecurityValue(email),
        ipHash: hashSecurityValue(ipAddress),
        count: result.count,
        limit: result.limit,
      },
      "warn",
    );
  }

  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String((body as { email?: unknown } | null)?.email ?? "").trim().toLowerCase();
  const password = String((body as { password?: unknown } | null)?.password ?? "");

  if (!email || !password) {
    return invalidCredentials();
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    await recordFailedLogin(email, request);
    return invalidCredentials();
  }

  if (user.status !== UserStatus.active) {
    return accountDisabled();
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    await recordFailedLogin(email, request);
    return invalidCredentials();
  }

  const { token } = await createExtensionToken(user.id);

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
