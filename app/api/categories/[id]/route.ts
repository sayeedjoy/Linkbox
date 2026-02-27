import { NextResponse } from "next/server";
import { userIdFromBearerToken } from "@/lib/api-auth";
import { getGroupsForUser, updateGroupForUser, deleteGroupForUser } from "@/app/actions/groups";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await userIdFromBearerToken(request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  const { id } = await params;
  if (!id)
    return NextResponse.json({ error: "Category id required" }, { status: 400, headers: corsHeaders(request) });
  let body: { name?: string; color?: string | null; order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) });
  }
  const data: { name?: string; color?: string | null; order?: number } = {};
  if (body?.name !== undefined) data.name = typeof body.name === "string" ? body.name : "";
  if (body?.color !== undefined) data.color = typeof body.color === "string" ? body.color : null;
  if (body?.order !== undefined) data.order = typeof body.order === "number" ? body.order : 0;
  await updateGroupForUser(userId, id, data);
  const groups = await getGroupsForUser(userId);
  const category = groups.find((g) => g.id === id);
  if (!category)
    return NextResponse.json({ error: "Category not found" }, { status: 404, headers: corsHeaders(request) });
  return NextResponse.json(
    { id: category.id, name: category.name, color: category.color, order: category.order, _count: category._count },
    { headers: corsHeaders(request) }
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await userIdFromBearerToken(_request.headers.get("Authorization"));
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(_request) });
  const { id } = await params;
  if (!id)
    return NextResponse.json({ error: "Category id required" }, { status: 400, headers: corsHeaders(_request) });
  await deleteGroupForUser(userId, id);
  return new NextResponse(null, { status: 204, headers: corsHeaders(_request) });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = { "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://")) headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
