import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { getGroupsForUser, createGroupForUser } from "@/app/actions/groups";

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

export async function POST(request: Request) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });

  let body: { name?: string; color?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400, headers: corsHeaders(request) });

  const color = body?.color !== undefined ? (typeof body.color === "string" ? body.color : null) : undefined;
  try {
    const group = await createGroupForUser(userId, name, color);
    return NextResponse.json(
      { id: group.id, name: group.name, color: group.color, order: group.order },
      { status: 201, headers: corsHeaders(request) }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create group";
    return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
