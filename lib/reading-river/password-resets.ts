import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/reading-river/auth";
import { getPrismaClient } from "@/lib/reading-river/db";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

type StoredPasswordResetToken = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
} | null;

export type PasswordResetState =
  | {
      status: "valid";
      resetToken: NonNullable<StoredPasswordResetToken>;
    }
  | {
      status: "invalid" | "expired" | "used";
      resetToken: null;
    };

export type PasswordResetResult =
  | {
      status: "success";
      user: {
        id: string;
        email: string;
        displayName: string | null;
      };
    }
  | {
      status: "invalid" | "invalid_input" | "expired" | "used";
    };

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getPasswordResetStatus(
  resetToken: StoredPasswordResetToken,
  now: Date,
): PasswordResetState["status"] {
  if (!resetToken) {
    return "invalid";
  }

  if (resetToken.usedAt) {
    return "used";
  }

  if (resetToken.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return "valid";
}

export async function createPasswordResetToken({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const prisma = getPrismaClient();
  const resetToken = await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MS),
    },
  });

  return { token, resetToken };
}

export async function getPasswordResetState(
  token: string | undefined,
  now = new Date(),
): Promise<PasswordResetState> {
  if (!token) {
    return {
      status: "invalid",
      resetToken: null,
    };
  }

  const prisma = getPrismaClient();
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashResetToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });
  const status = getPasswordResetStatus(resetToken, now);

  if (!resetToken) {
    return {
      status: "invalid",
      resetToken: null,
    };
  }

  if (status !== "valid") {
    return {
      status,
      resetToken: null,
    };
  }

  return {
    status: "valid",
    resetToken,
  };
}

export async function redeemPasswordResetToken({
  token,
  password,
  now = new Date(),
}: {
  token: string;
  password: string;
  now?: Date;
}): Promise<PasswordResetResult> {
  if (!token.trim() || !password.trim()) {
    return {
      status: "invalid_input",
    };
  }

  const resetState = await getPasswordResetState(token, now);

  if (resetState.status !== "valid") {
    return {
      status: resetState.status,
    };
  }

  const prisma = getPrismaClient();
  const user = await prisma.$transaction(async (transaction) => {
    const updatedUser = await transaction.user.update({
      where: {
        id: resetState.resetToken.userId,
      },
      data: {
        passwordHash: await hashPassword(password),
      },
    });

    await transaction.passwordResetToken.update({
      where: {
        id: resetState.resetToken.id,
      },
      data: {
        usedAt: now,
      },
    });

    await transaction.session.updateMany({
      where: {
        userId: resetState.resetToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    return updatedUser;
  });

  return {
    status: "success",
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}
