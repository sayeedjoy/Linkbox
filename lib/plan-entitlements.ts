import { eq } from "drizzle-orm";
import { db, users, subscriptionPlans } from "@/lib/db";

export const PLAN_SLUG_FREE = "free";
export const PLAN_SLUG_PREMIUM = "premium";

export const PLAN_SOURCE_DEFAULT = "default";
export const PLAN_SOURCE_PLAY = "play";
export const PLAN_SOURCE_ADMIN = "admin";

export type PlanFeaturesForUser = {
  planSource: string;
  slug: string;
  displayName: string;
  aiGroupingAllowed: boolean;
  groupColoringAllowed: boolean;
  apiQuotaPerDay: number | null;
};

export type EntitlementsPayload = PlanFeaturesForUser & {
  autoGroupEnabled: boolean;
};

export async function getPlanFeaturesForUser(userId: string): Promise<PlanFeaturesForUser> {
  const [row] = await db
    .select({
      planSource: users.planSource,
      slug: subscriptionPlans.slug,
      displayName: subscriptionPlans.displayName,
      aiGroupingAllowed: subscriptionPlans.aiGroupingAllowed,
      groupColoringAllowed: subscriptionPlans.groupColoringAllowed,
      apiQuotaPerDay: subscriptionPlans.apiQuotaPerDay,
    })
    .from(users)
    .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw new Error("User not found");
  return row;
}

export async function getFreePlanId(): Promise<string> {
  const [p] = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, PLAN_SLUG_FREE))
    .limit(1);
  if (!p?.id) throw new Error("Free plan not configured");
  return p.id;
}

export async function getPremiumPlanForPlayProduct(productId: string) {
  const [row] = await db
    .select({
      id: subscriptionPlans.id,
      slug: subscriptionPlans.slug,
      googlePlayProductId: subscriptionPlans.googlePlayProductId,
    })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.googlePlayProductId, productId))
    .limit(1);
  return row ?? null;
}

export async function getAllPlansOrdered() {
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

export async function getEntitlementsPayload(userId: string): Promise<EntitlementsPayload> {
  const [userRow] = await db
    .select({
      autoGroupEnabled: users.autoGroupEnabled,
      planSource: users.planSource,
      slug: subscriptionPlans.slug,
      displayName: subscriptionPlans.displayName,
      aiGroupingAllowed: subscriptionPlans.aiGroupingAllowed,
      groupColoringAllowed: subscriptionPlans.groupColoringAllowed,
      apiQuotaPerDay: subscriptionPlans.apiQuotaPerDay,
    })
    .from(users)
    .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!userRow) throw new Error("User not found");
  return {
    planSource: userRow.planSource,
    slug: userRow.slug,
    displayName: userRow.displayName,
    aiGroupingAllowed: userRow.aiGroupingAllowed,
    groupColoringAllowed: userRow.groupColoringAllowed,
    apiQuotaPerDay: userRow.apiQuotaPerDay,
    autoGroupEnabled: userRow.autoGroupEnabled,
  };
}

export function resolveGroupColorForPlan(
  groupColoringAllowed: boolean,
  requestedColor: string | null | undefined
): string | null {
  if (!groupColoringAllowed) return null;
  if (requestedColor === undefined || requestedColor === null || requestedColor === "") return null;
  return requestedColor;
}
