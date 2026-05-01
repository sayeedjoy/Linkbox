import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { resolveApiUserId } from "@/lib/api-auth";
import { db, users } from "@/lib/db";
import { backfillUngroupedBookmarks } from "@/app/actions/categorize";
import { getEntitlementsPayload, getPlanFeaturesForUser } from "@/lib/plan-entitlements";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  try {
    const entitlements = await getEntitlementsPayload(userId);
    return NextResponse.json(
      {
        autoGroupEnabled: entitlements.autoGroupEnabled,
        aiGroupingAllowed: entitlements.aiGroupingAllowed,
        groupColoringAllowed: entitlements.groupColoringAllowed,
        apiQuotaPerDay: entitlements.apiQuotaPerDay,
        planSource: entitlements.planSource,
        plan: { slug: entitlements.slug, displayName: entitlements.displayName },
      },
      { headers: corsHeaders(request) }
    );
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: corsHeaders(request) });
  }
}

export async function PATCH(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  let body: { autoGroupEnabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }

  const data: { autoGroupEnabled?: boolean } = {};
  if (typeof body?.autoGroupEnabled === "boolean") data.autoGroupEnabled = body.autoGroupEnabled;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400, headers: corsHeaders(request) });
  }

  if (data.autoGroupEnabled === true) {
    const plan = await getPlanFeaturesForUser(userId);
    if (!plan.aiGroupingAllowed) {
      return NextResponse.json(
        { error: "Auto grouping is not available on your plan." },
        { status: 403, headers: corsHeaders(request) }
      );
    }
  }

  await db.update(users).set(data).where(eq(users.id, userId));

  if (data.autoGroupEnabled === true) {
    backfillUngroupedBookmarks(userId).catch(() => {});
  }

  try {
    const entitlements = await getEntitlementsPayload(userId);
    return NextResponse.json(
      {
        autoGroupEnabled: entitlements.autoGroupEnabled,
        aiGroupingAllowed: entitlements.aiGroupingAllowed,
        groupColoringAllowed: entitlements.groupColoringAllowed,
        apiQuotaPerDay: entitlements.apiQuotaPerDay,
        planSource: entitlements.planSource,
        plan: { slug: entitlements.slug, displayName: entitlements.displayName },
      },
      { headers: corsHeaders(request) }
    );
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
