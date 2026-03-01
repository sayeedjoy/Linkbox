"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { hashToken } from "@/lib/api-auth";
import {
  isPublicSignupEnabled,
  isPublicSignupEnabledForClient,
} from "@/lib/app-config";
import { sendPasswordResetEmail } from "@/lib/email";

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
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return { ok: true };
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);
  return { ok: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ ok: true } | { error: string }> {
  if (!token?.trim()) return { error: "Invalid or expired reset link" };
  const tokenHash = hashToken(token.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.expiresAt < new Date())
    return { error: "Invalid or expired reset link" };
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
  ]);
  return { ok: true };
}
