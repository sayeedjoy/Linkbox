import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { db, users, userPlaySubscriptions } from "@/lib/db";
import { getEntitlementsPayload, getFreePlanId, getPremiumPlanForPlayProduct, PLAN_SOURCE_ADMIN, PLAN_SOURCE_DEFAULT, PLAN_SOURCE_PLAY } from "@/lib/plan-entitlements";
import { isPlaySubscriptionEntitled, verifyPlaySubscription } from "@/lib/google-play";

type Body = {
  purchaseToken?: string;
  productId?: string;
};

export async function POST(request: Request) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!purchaseToken || !productId) {
    return NextResponse.json({ error: "purchaseToken and productId are required" }, { status: 400 });
  }

  const verified = await verifyPlaySubscription(purchaseToken);
  if (!verified.ok) {
    const status = verified.reason === "env" ? 503 : 502;
    const message =
      verified.reason === "env"
        ? "Google Play verification is not configured on the server."
        : "Google Play verification failed.";
    return NextResponse.json({ error: message }, { status });
  }

  const entitled = isPlaySubscriptionEntitled(verified.subscriptionState);
  const matchesVerifiedProduct = verified.productIds.includes(productId);
  if (!matchesVerifiedProduct) {
    return NextResponse.json(
      { error: "purchaseToken does not match the provided productId." },
      { status: 400 }
    );
  }

  const planRow = await getPremiumPlanForPlayProduct(productId);
  if (!planRow) {
    return NextResponse.json(
      { error: "No subscription plan is linked to this Google Play product ID." },
      { status: 400 }
    );
  }

  const [u] = await db
    .select({ planSource: users.planSource })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (u.planSource !== PLAN_SOURCE_ADMIN) {
    if (entitled) {
      await db
        .update(users)
        .set({ subscriptionPlanId: planRow.id, planSource: PLAN_SOURCE_PLAY })
        .where(eq(users.id, userId));
    } else if (u.planSource === PLAN_SOURCE_PLAY) {
      const freeId = await getFreePlanId();
      await db
        .update(users)
        .set({ subscriptionPlanId: freeId, planSource: PLAN_SOURCE_DEFAULT })
        .where(eq(users.id, userId));
    }
  }

  await db
    .insert(userPlaySubscriptions)
    .values({
      id: createId(),
      userId,
      productId,
      purchaseToken,
      expiryTime: null,
      autoRenewing: false,
      lastVerifiedAt: new Date(),
      rawPayload: JSON.stringify(verified.raw ?? {}),
    })
    .onConflictDoUpdate({
      target: userPlaySubscriptions.purchaseToken,
      set: {
        userId,
        productId,
        lastVerifiedAt: new Date(),
        rawPayload: JSON.stringify(verified.raw ?? {}),
      },
    });

  try {
    const entitlements = await getEntitlementsPayload(userId);
    return NextResponse.json({
      entitled,
      subscriptionState: verified.subscriptionState ?? null,
      entitlements: {
        autoGroupEnabled: entitlements.autoGroupEnabled,
        aiGroupingAllowed: entitlements.aiGroupingAllowed,
        groupColoringAllowed: entitlements.groupColoringAllowed,
        apiQuotaPerDay: entitlements.apiQuotaPerDay,
        planSource: entitlements.planSource,
        plan: { slug: entitlements.slug, displayName: entitlements.displayName },
      },
    });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
