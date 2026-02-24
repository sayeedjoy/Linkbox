import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { getGroupsForUser } from "@/app/actions/groups";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function GET(request: Request) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const groups = await getGroupsForUser(userId);
  const data = groups.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    order: g.order,
    _count: g._count,
  }));
  return NextResponse.json(data, { headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Authorization", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
