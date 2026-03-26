"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import {
  isPublicSignupEnabled,
  isPublicSignupEnabledForClient,
} from "@/lib/app-config";
import {
  requestPasswordResetByEmail,
  resetPasswordWithToken,
} from "@/lib/password-reset";

export async function register(email: string, password: string, name?: string) {
  const publicSignupEnabled = await isPublicSignupEnabled();
  if (!publicSignupEnabled) throw new Error("Public signups are disabled");

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) throw new Error("User already exists");
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      password: hashed,
      name: name?.trim() || null,
    },
  });
}

export async function deleteAccount(): Promise<{ ok: true } | { error: string }> {
  const userId = await currentUserId();
  if (!userId) return { error: "Not authenticated" };

  return prisma.$transaction(async (tx) => {
    const [totalUsers, publicSignupEnabled] = await Promise.all([
      tx.user.count(),
      isPublicSignupEnabledForClient(tx),
    ]);

    if (totalUsers <= 1 && !publicSignupEnabled) {
      return {
        error: "Cannot delete the last account while public signup is disabled.",
      };
    }

    await tx.user.delete({ where: { id: userId } });
    return { ok: true };
  });
}

export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  return requestPasswordResetByEmail(email);
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ ok: true } | { error: string }> {
  return resetPasswordWithToken(token, newPassword);
}
