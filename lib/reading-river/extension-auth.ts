import { createHash, randomBytes } from "node:crypto";
import { getSessionCookieOptions } from "@/lib/reading-river/auth";
import { getPrismaClient } from "@/lib/reading-river/db";

const EXTENSION_TOKEN_BYTES = 32;

type StoredExtensionToken = Awaited<
  ReturnType<ReturnType<typeof getPrismaClient>["extensionToken"]["findUnique"]>
>;

function isMissingExtensionTokenTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    meta?: {
      modelName?: unknown;
    };
  };

  return candidate.code === "P2021" && candidate.meta?.modelName === "ExtensionToken";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return randomBytes(EXTENSION_TOKEN_BYTES).toString("hex");
}

export async function createExtensionToken(userId: string, options: { now?: Date } = {}) {
  const now = options.now ?? new Date();
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + getSessionCookieOptions().maxAge * 1000);
  const prisma = getPrismaClient();
  const extensionToken = await prisma.extensionToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastUsedAt: now,
    },
  });

  return { token, extensionToken };
}

export async function getExtensionTokenByToken(token: string | undefined, now = new Date()) {
  if (!token) {
    return null;
  }

  const prisma = getPrismaClient();

  let extensionToken: StoredExtensionToken;

  try {
    extensionToken = await prisma.extensionToken.findUnique({
      where: {
        tokenHash: hashToken(token),
      },
    });
  } catch (error) {
    if (isMissingExtensionTokenTableError(error)) {
      return null;
    }

    throw error;
  }

  if (!extensionToken) {
    return null;
  }

  if (extensionToken.revokedAt || extensionToken.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  return extensionToken;
}

export async function revokeExtensionToken(token: string, now = new Date()) {
  const prisma = getPrismaClient();

  await prisma.extensionToken.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: now,
    },
  });
}
