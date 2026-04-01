import { createHash, randomBytes } from "node:crypto";
import { UserStatus } from "@prisma/client";
import { getSessionCookieOptions } from "@/lib/reading-river/auth";
import { getPrismaClient } from "@/lib/reading-river/db";

function isMissingSessionTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    meta?: {
      modelName?: unknown;
    };
  };

  return candidate.code === "P2021" && candidate.meta?.modelName === "Session";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string, options: { now?: Date } = {}) {
  const now = options.now ?? new Date();
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + getSessionCookieOptions().maxAge * 1000);
  const prisma = getPrismaClient();
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastUsedAt: now,
    },
  });

  return { token, session };
}

export async function getSessionByToken(token: string | undefined, now = new Date()) {
  if (!token) {
    return null;
  }

  const prisma = getPrismaClient();
  let session;

  try {
    session = await prisma.session.findUnique({
      where: {
        tokenHash: hashToken(token),
      },
      include: {
        user: true,
      },
    });
  } catch (error) {
    if (isMissingSessionTableError(error)) {
      return null;
    }

    throw error;
  }

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  return session;
}

export async function revokeSession(token: string, now = new Date()) {
  const prisma = getPrismaClient();

  await prisma.session.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: now,
    },
  });
}

export async function getCurrentUserFromSessionToken(token: string | undefined, now = new Date()) {
  const session = await getSessionByToken(token, now);

  if (!session?.user || session.user.status !== UserStatus.active) {
    return null;
  }

  return session.user;
}
