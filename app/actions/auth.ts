"use server";

import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { getFreePlanId } from "@/lib/plan-entitlements";
import { currentUserId } from "@/lib/auth";
import {
  isPublicSignupEnabled,
  isPublicSignupEnabledForClient,
} from "@/lib/app-config";
import {
  requestPasswordResetByEmail,
  resetPasswordWithToken,
} from "@/lib/password-reset";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";

export async function register(email: string, password: string, name?: string) {
  const publicSignupEnabled = await isPublicSignupEnabled();
  if (!publicSignupEnabled) throw new Error("Public signups are disabled");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (existing) throw new Error("User already exists");
  const hashed = await bcrypt.hash(password, 12);
  const freePlanId = await getFreePlanId();
  await db.insert(users).values({
    email: email.trim().toLowerCase(),
    password: hashed,
    name: name?.trim() || null,
    subscriptionPlanId: freePlanId,
  });
}

export async function deleteAccount(): Promise<{ ok: true } | { error: string }> {
  const userId = await currentUserId();
  if (!userId) return { error: "Not authenticated" };

  return db.transaction(async (tx) => {
    const [{ value: totalUsers }] = await tx
      .select({ value: count() })
      .from(users);
    const publicSignupEnabled = await isPublicSignupEnabledForClient(
      tx as NodePgDatabase<typeof schema>
    );

    if (totalUsers <= 1 && !publicSignupEnabled) {
      return {
        error: "Cannot delete the last account while public signup is disabled.",
      };
    }

    await tx.delete(users).where(eq(users.id, userId));
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
