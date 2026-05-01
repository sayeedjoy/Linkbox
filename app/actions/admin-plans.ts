"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db, subscriptionPlans } from "@/lib/db";

export type AdminPlanRow = {
  id: string;
  slug: string;
  displayName: string;
  googlePlayProductId: string | null;
  aiGroupingAllowed: boolean;
  groupColoringAllowed: boolean;
  apiQuotaPerDay: number | null;
  sortOrder: number;
};

function isPgUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return (error as { code?: string }).code === "23505";
}

export async function getPlansForAdmin(): Promise<AdminPlanRow[]> {
  await requireAdminSession();
  return db
    .select({
      id: subscriptionPlans.id,
      slug: subscriptionPlans.slug,
      displayName: subscriptionPlans.displayName,
      googlePlayProductId: subscriptionPlans.googlePlayProductId,
      aiGroupingAllowed: subscriptionPlans.aiGroupingAllowed,
      groupColoringAllowed: subscriptionPlans.groupColoringAllowed,
      apiQuotaPerDay: subscriptionPlans.apiQuotaPerDay,
      sortOrder: subscriptionPlans.sortOrder,
    })
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.sortOrder);
}

export async function updatePlanAsAdmin(input: {
  id: string;
  displayName: string;
  googlePlayProductId: string | null;
  aiGroupingAllowed: boolean;
  groupColoringAllowed: boolean;
  apiQuotaPerDay: number | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdminSession();
    const displayName = input.displayName.trim();
    if (!displayName) return { success: false, error: "Display name is required." };

    const gp =
      input.googlePlayProductId === null || input.googlePlayProductId === undefined
        ? null
        : input.googlePlayProductId.trim() || null;
    const quota = input.apiQuotaPerDay;
    if (quota !== null) {
      if (!Number.isInteger(quota) || quota < 0) {
        return { success: false, error: "API quota per day must be a non-negative integer or empty." };
      }
    }

    await db
      .update(subscriptionPlans)
      .set({
        displayName,
        googlePlayProductId: gp,
        aiGroupingAllowed: input.aiGroupingAllowed,
        groupColoringAllowed: input.groupColoringAllowed,
        apiQuotaPerDay: quota,
      })
      .where(eq(subscriptionPlans.id, input.id));

    revalidatePath("/admin/plan");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    unstable_rethrow(error);
    if (isPgUniqueViolation(error)) {
      return { success: false, error: "Google Play product ID must be unique." };
    }
    return { success: false, error: "Failed to update plan." };
  }
}
