import { NextResponse } from "next/server";
import { resolveApiUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    return { "Access-Control-Allow-Origin": origin };
  return {};
}

/**
 * GET /api/settings — return user preferences.
 * Supports both browser session auth and bearer token auth (extension).
 */
export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(request) }
    );

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { autoGroupEnabled: true },
  });

  return NextResponse.json(
    { autoGroupEnabled: user.autoGroupEnabled },
    { headers: corsHeaders(request) }
  );
}

/**
 * PATCH /api/settings — update user preferences.
 * Accepts JSON body: { autoGroupEnabled?: boolean }
 */
export async function PATCH(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(request) }
    );

  let body: { autoGroupEnabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const data: { autoGroupEnabled?: boolean } = {};

  if (typeof body?.autoGroupEnabled === "boolean") {
    data.autoGroupEnabled = body.autoGroupEnabled;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { autoGroupEnabled: true },
  });

  return NextResponse.json(
    { autoGroupEnabled: user.autoGroupEnabled },
    { headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (origin?.startsWith("chrome-extension://"))
    headers["Access-Control-Allow-Origin"] = origin;
  return new NextResponse(null, { status: 204, headers });
}
