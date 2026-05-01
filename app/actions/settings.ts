"use server";

import { eq } from "drizzle-orm";
import { currentUserId } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { backfillUngroupedBookmarks } from "@/app/actions/categorize";
import { getEntitlementsPayload, getPlanFeaturesForUser } from "@/lib/plan-entitlements";

export async function getWebDashboardEntitlements() {
  const userId = await currentUserId();
  return getEntitlementsPayload(userId);
}

export async function getAutoGroupEnabled(): Promise<boolean> {
  const userId = await currentUserId();
  const [user] = await db
    .select({ autoGroupEnabled: users.autoGroupEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("User not found");
  return user.autoGroupEnabled;
}

export async function updateAutoGroupEnabled(
  enabled: boolean
): Promise<{ success: true }> {
  const userId = await currentUserId();
  if (enabled) {
    const plan = await getPlanFeaturesForUser(userId);
    if (!plan.aiGroupingAllowed) throw new Error("Auto grouping is not available on your plan.");
  }
  await db.update(users).set({ autoGroupEnabled: enabled }).where(eq(users.id, userId));

  if (enabled) {
    backfillUngroupedBookmarks(userId).catch(() => {});
  }

  return { success: true };
}
