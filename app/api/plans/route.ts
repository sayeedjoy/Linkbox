import { NextResponse } from "next/server";
import { getAllPlansOrdered } from "@/lib/plan-entitlements";

export async function GET() {
  const plans = await getAllPlansOrdered();
  return NextResponse.json({ plans });
}
