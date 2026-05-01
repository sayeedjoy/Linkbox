import { NextResponse } from "next/server";
import { getAllPlansOrdered } from "@/lib/plan-entitlements";
import { resolveApiUserId } from "@/lib/api-auth";

export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await getAllPlansOrdered();
  return NextResponse.json({ plans });
}
