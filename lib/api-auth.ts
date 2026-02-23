import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function userIdFromBearerToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const hash = hashToken(token);
  const record = await prisma.apiToken.findFirst({
    where: { tokenHash: hash },
    select: { id: true, userId: true },
  });
  if (!record) return null;
  await prisma.apiToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });
  return record.userId;
}
