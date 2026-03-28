import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/api-auth";

function bearerFromAuthHeader(authHeader: string | null): string | null {
  const raw = authHeader?.trim();
  if (!raw) return null;
  const schemeMatch = raw.match(/^([A-Za-z]+)\s+(.+)$/);
  if (schemeMatch) {
    const scheme = schemeMatch[1]?.toLowerCase();
    const token = schemeMatch[2]?.trim();
    if (!token) return null;
    if (scheme === "bearer" || scheme === "token") return token;
    return null;
  }
  if (raw.includes(" ")) return null;
  return raw;
}

export async function POST(request: Request) {
  const token = bearerFromAuthHeader(request.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const tokenHash = hashToken(token);
  const result = await prisma.apiToken.deleteMany({ where: { tokenHash } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
