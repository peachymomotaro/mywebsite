import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/reading-river/auth";
import { createExtensionToken } from "@/lib/reading-river/extension-auth";
import { getPrismaClient } from "@/lib/reading-river/db";

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
    return invalidCredentials();
  }

  if (user.status !== UserStatus.active) {
    return accountDisabled();
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
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
