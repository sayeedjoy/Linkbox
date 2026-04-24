import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, passwordResetTokens } from "@/lib/db";
import { hashToken } from "@/lib/api-auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function requestPasswordResetByEmail(email: string): Promise<{ ok: true }> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, normalized)).limit(1);
  if (!user) return { ok: true };

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return { ok: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: true } | { error: string }> {
  if (!token?.trim()) return { error: "Invalid or expired reset link" };

  const tokenHash = hashToken(token.trim());
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.expiresAt < new Date()) {
    return { error: "Invalid or expired reset link" };
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ password: hashed }).where(eq(users.id, record.userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));
  });

  return { ok: true };
}
