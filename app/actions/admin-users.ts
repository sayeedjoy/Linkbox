"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { eq, desc, count, asc, and } from "drizzle-orm";
import { requireAdminSession } from "@/lib/admin";
import { db, users, apiTokens, groups, bookmarks, passwordResetTokens, subscriptionPlans, userPlaySubscriptions } from "@/lib/db";
import { getFreePlanId, PLAN_SOURCE_ADMIN, PLAN_SOURCE_DEFAULT } from "@/lib/plan-entitlements";
import { hashToken } from "@/lib/api-auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { publishUserEvent } from "@/lib/realtime";


export async function deleteUserAsAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAdminSession();
    const targetUserId = userId.trim();

    if (!targetUserId) return { success: false, error: "User not found." };

    if (session.user.id === targetUserId) {
      return { success: false, error: "You cannot delete your own account from the admin panel." };
    }

    const result = await db.delete(users).where(eq(users.id, targetUserId)).returning({ id: users.id });
    if (result.length === 0) return { success: false, error: "User not found." };

    publishUserEvent(targetUserId, {
      type: "user.deleted",
      entity: "user",
      id: targetUserId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidateTag("admin-stats", "max");

    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to delete user." };
  }
}

export async function inviteUserAsAdmin(
  email: string,
  name?: string
): Promise<{ success: true; resetUrl: string } | { success: false; error: string }> {
  try {
    await requireAdminSession();

    const normalized = email.trim().toLowerCase();
    if (!normalized) return { success: false, error: "Email is required." };

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
    if (existing) return { success: false, error: "An account with that email already exists." };

    const randomPassword = randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    const freePlanId = await getFreePlanId();

    const [user] = await db
      .insert(users)
      .values({
        email: normalized,
        password: hashedPassword,
        name: name?.trim() || null,
        subscriptionPlanId: freePlanId,
      })
      .returning({ id: users.id });

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(normalized, resetUrl);
    } catch {
      // Email not configured — caller shows the fallback link
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidateTag("admin-stats", "max");

    return { success: true, resetUrl };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to create invite." };
  }
}

export type UserDetails = {
  bookmarkCount: number;
  groupCount: number;
  apiTokenCount: number;
  autoGroupEnabled: boolean;
  createdAt: string | null;
  lastTokenUsedAt: string | null;
  bannedUntil: string | null;
  subscriptionPlanId: string;
  planSource: string;
  planSlug: string;
  planDisplayName: string;
  playSubscription: {
    productId: string;
    purchaseToken: string;
    transactionId: string | null;
    purchaseDate: string | null;
    expiryTime: string | null;
    autoRenewing: boolean;
    lastVerifiedAt: string | null;
  } | null;
  availablePlans: { id: string; displayName: string; slug: string }[];
};

export async function getUserDetailsAsAdmin(
  userId: string
): Promise<{ success: true; data: UserDetails } | { success: false; error: string }> {
  try {
    await requireAdminSession();

    const [user] = await db
      .select({
        autoGroupEnabled: users.autoGroupEnabled,
        createdAt: users.createdAt,
        bannedUntil: users.bannedUntil,
        subscriptionPlanId: users.subscriptionPlanId,
        planSource: users.planSource,
        planSlug: subscriptionPlans.slug,
        planDisplayName: subscriptionPlans.displayName,
      })
      .from(users)
      .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return { success: false, error: "User not found." };

    const [[{ bookmarkCount }], [{ groupCount }], [{ apiTokenCount }], lastToken, availablePlans, latestPlaySubscription] =
      await Promise.all([
        db.select({ bookmarkCount: count() }).from(bookmarks).where(eq(bookmarks.userId, userId)),
        db.select({ groupCount: count() }).from(groups).where(eq(groups.userId, userId)),
        db.select({ apiTokenCount: count() }).from(apiTokens).where(eq(apiTokens.userId, userId)),
        db
          .select({ lastUsedAt: apiTokens.lastUsedAt })
          .from(apiTokens)
          .where(eq(apiTokens.userId, userId))
          .orderBy(desc(apiTokens.lastUsedAt))
          .limit(1),
        db
          .select({
            id: subscriptionPlans.id,
            displayName: subscriptionPlans.displayName,
            slug: subscriptionPlans.slug,
          })
          .from(subscriptionPlans)
          .orderBy(asc(subscriptionPlans.sortOrder)),
        db
          .select({
            productId: userPlaySubscriptions.productId,
            purchaseToken: userPlaySubscriptions.purchaseToken,
            transactionId: userPlaySubscriptions.transactionId,
            purchaseDate: userPlaySubscriptions.purchaseDate,
            expiryTime: userPlaySubscriptions.expiryTime,
            autoRenewing: userPlaySubscriptions.autoRenewing,
            lastVerifiedAt: userPlaySubscriptions.lastVerifiedAt,
          })
          .from(userPlaySubscriptions)
          .where(eq(userPlaySubscriptions.userId, userId))
          .orderBy(desc(userPlaySubscriptions.lastVerifiedAt), desc(userPlaySubscriptions.purchaseDate))
          .limit(1),
      ]);

    return {
      success: true,
      data: {
        bookmarkCount,
        groupCount,
        apiTokenCount,
        autoGroupEnabled: user.autoGroupEnabled,
        createdAt: user.createdAt?.toISOString() ?? null,
        lastTokenUsedAt: lastToken?.[0]?.lastUsedAt?.toISOString() ?? null,
        bannedUntil: user.bannedUntil?.toISOString() ?? null,
        subscriptionPlanId: user.subscriptionPlanId,
        planSource: user.planSource,
        planSlug: user.planSlug,
        planDisplayName: user.planDisplayName,
        playSubscription: latestPlaySubscription?.[0]
          ? {
              productId: latestPlaySubscription[0].productId,
              purchaseToken: latestPlaySubscription[0].purchaseToken,
              transactionId: latestPlaySubscription[0].transactionId,
              purchaseDate: latestPlaySubscription[0].purchaseDate?.toISOString() ?? null,
              expiryTime: latestPlaySubscription[0].expiryTime?.toISOString() ?? null,
              autoRenewing: latestPlaySubscription[0].autoRenewing,
              lastVerifiedAt: latestPlaySubscription[0].lastVerifiedAt?.toISOString() ?? null,
            }
          : null,
        availablePlans,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[getUserDetailsAsAdmin]", msg);
    return { success: false, error: "Failed to load user details." };
  }
}

const BAN_DURATIONS: Record<string, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
};

export async function banUserAsAdmin(
  userId: string,
  durationKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAdminSession();

    if (session.user.id === userId) return { success: false, error: "You cannot ban your own account." };

    const hours = BAN_DURATIONS[durationKey];
    if (!hours) return { success: false, error: "Invalid ban duration." };

    const bannedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

    const result = await db.update(users).set({ bannedUntil }).where(eq(users.id, userId)).returning({ id: users.id });
    if (result.length === 0) return { success: false, error: "User not found." };

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to ban user." };
  }
}

export async function unbanUserAsAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminSession();

    const result = await db.update(users).set({ bannedUntil: null }).where(eq(users.id, userId)).returning({ id: users.id });
    if (result.length === 0) return { success: false, error: "User not found." };

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to unban user." };
  }
}

export async function setUserSubscriptionPlanAsAdmin(
  userId: string,
  planId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminSession();
    const targetUserId = userId.trim();
    const trimmedPlan = planId.trim();
    if (!targetUserId) return { success: false, error: "User not found." };
    if (!trimmedPlan) return { success: false, error: "Plan is required." };

    const [plan] = await db
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, trimmedPlan))
      .limit(1);
    if (!plan) return { success: false, error: "Plan not found." };

    const updated = await db
      .update(users)
      .set({ subscriptionPlanId: trimmedPlan, planSource: PLAN_SOURCE_ADMIN })
      .where(eq(users.id, targetUserId))
      .returning({ id: users.id });
    if (updated.length === 0) return { success: false, error: "User not found." };

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to update plan." };
  }
}

export async function clearManualPlanOverrideAsAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminSession();
    const targetUserId = userId.trim();
    if (!targetUserId) return { success: false, error: "User not found." };

    const freePlanId = await getFreePlanId();
    const updated = await db
      .update(users)
      .set({ subscriptionPlanId: freePlanId, planSource: PLAN_SOURCE_DEFAULT })
      .where(
        and(eq(users.id, targetUserId), eq(users.planSource, PLAN_SOURCE_ADMIN))
      )
      .returning({ id: users.id });
    if (updated.length === 0) {
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
      if (!exists) return { success: false, error: "User not found." };
      return { success: false, error: "User has no manual admin override." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: "Failed to clear manual assignment." };
  }
}
