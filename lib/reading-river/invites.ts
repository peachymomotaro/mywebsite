import { createHash, randomBytes } from "node:crypto";
import { UserStatus } from "@prisma/client";
import { hashPassword } from "@/lib/reading-river/auth";
import { getPrismaClient } from "@/lib/reading-river/db";

const INVITE_TOKEN_BYTES = 32;
const DEFAULT_INVITE_EXPIRY_DAYS = 7;

type StoredInvite = Awaited<ReturnType<ReturnType<typeof getPrismaClient>["invite"]["findUnique"]>>;

export type InviteRedemptionState =
  | {
      status: "valid";
      invite: NonNullable<StoredInvite>;
    }
  | {
      status: "invalid" | "expired" | "revoked" | "redeemed";
      invite: null;
    };

export type InviteRedemptionResult =
  | {
      status: "success";
      user: {
        id: string;
        email: string;
        displayName: string | null;
      };
    }
  | {
      status: "invalid" | "invalid_input" | "expired" | "revoked" | "redeemed" | "account_exists";
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getInviteStatus(invite: StoredInvite, now: Date): InviteRedemptionState["status"] {
  if (!invite) {
    return "invalid";
  }

  if (invite.redeemedAt) {
    return "redeemed";
  }

  if (invite.revokedAt) {
    return "revoked";
  }

  if (invite.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return "valid";
}

export async function createInvite({
  email,
  createdByUserId,
  expiresAt,
  now = new Date(),
}: {
  email: string;
  createdByUserId: string;
  expiresAt?: Date;
  now?: Date;
}) {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString("hex");
  const prisma = getPrismaClient();
  const invite = await prisma.invite.create({
    data: {
      email: normalizeEmail(email),
      tokenHash: hashInviteToken(token),
      createdByUserId,
      expiresAt:
        expiresAt ??
        new Date(now.getTime() + DEFAULT_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { token, invite };
}

export async function getInviteRedemptionState(
  token: string | undefined,
  now = new Date(),
): Promise<InviteRedemptionState> {
  if (!token) {
    return {
      status: "invalid",
      invite: null,
    };
  }

  const prisma = getPrismaClient();
  const invite = await prisma.invite.findUnique({
    where: {
      tokenHash: hashInviteToken(token),
    },
  });
  const status = getInviteStatus(invite, now);

  if (!invite) {
    return {
      status: "invalid",
      invite: null,
    };
  }

  if (status !== "valid") {
    return {
      status,
      invite: null,
    };
  }

  return {
    status: "valid",
    invite,
  };
}

export async function redeemInvite({
  token,
  password,
  displayName,
  now = new Date(),
}: {
  token: string;
  password: string;
  displayName?: string;
  now?: Date;
}): Promise<InviteRedemptionResult> {
  if (!token.trim() || !password.trim()) {
    return {
      status: "invalid_input",
    };
  }

  const redemptionState = await getInviteRedemptionState(token, now);

  if (redemptionState.status !== "valid") {
    return {
      status: redemptionState.status,
    };
  }

  const prisma = getPrismaClient();
  const email = normalizeEmail(redemptionState.invite.email);
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return {
      status: "account_exists",
    };
  }

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        email,
        displayName: displayName?.trim() || null,
        passwordHash: await hashPassword(password),
        status: UserStatus.active,
      },
    });

    await transaction.invite.update({
      where: {
        id: redemptionState.invite.id,
      },
      data: {
        redeemedAt: now,
        redeemedByUserId: createdUser.id,
      },
    });

    return createdUser;
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
