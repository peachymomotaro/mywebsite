"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendReadingRiverInviteEmail } from "@/lib/reading-river/email";
import { createInvite } from "@/lib/reading-river/invites";
import { getPrismaClient } from "@/lib/reading-river/db";
import { requireAdminUser } from "@/lib/reading-river/current-user";
import { readingRiverPath } from "@/lib/reading-river/routes";
import { hashSecurityValue, logSecurityEvent } from "@/lib/reading-river/security-log";

export async function createInviteAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(readingRiverPath("/admin"));
  }

  const { token } = await createInvite({
    email,
    createdByUserId: currentUser.id,
  });
  logSecurityEvent("admin_action", {
    action: "create_invite",
    userId: currentUser.id,
    emailHash: hashSecurityValue(email),
  });
  let emailStatus = "sent";

  try {
    await sendReadingRiverInviteEmail({
      email,
      token,
    });
  } catch {
    emailStatus = "failed";
  }

  revalidatePath(readingRiverPath("/admin"));
  redirect(
    readingRiverPath(
      `/admin?inviteToken=${encodeURIComponent(token)}&emailStatus=${emailStatus}`,
    ),
  );
}

export async function revokeInviteAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const inviteId = String(formData.get("inviteId") ?? "").trim();

  if (!inviteId) {
    redirect(readingRiverPath("/admin"));
  }

  const prisma = getPrismaClient();
  const invite = await prisma.invite.findUnique({
    where: {
      id: inviteId,
    },
  });

  if (invite && !invite.redeemedAt && !invite.revokedAt) {
    await prisma.invite.update({
      where: {
        id: invite.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    logSecurityEvent("admin_action", {
      action: "revoke_invite",
      userId: currentUser.id,
      inviteId: invite.id,
    });
  }

  revalidatePath(readingRiverPath("/admin"));
  redirect(readingRiverPath("/admin"));
}

export async function deactivateUserAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    redirect(readingRiverPath("/admin"));
  }

  const prisma = getPrismaClient();
  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!targetUser || targetUser.id === currentUser.id || targetUser.isAdmin) {
    redirect(readingRiverPath("/admin"));
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status: "deactivated",
    },
  });
  logSecurityEvent("admin_action", {
    action: "deactivate_user",
    userId: currentUser.id,
    targetUserId: userId,
  });
  logSecurityEvent("user_deactivated", {
    userId: currentUser.id,
    targetUserId: userId,
  });

  revalidatePath(readingRiverPath("/admin"));
  redirect(readingRiverPath("/admin"));
}
