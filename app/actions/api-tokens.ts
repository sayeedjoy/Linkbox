"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";
import { hashToken } from "@/lib/api-auth";

export async function createApiToken(name: string = "Default"): Promise<
  | { token: string; id: string; name: string; createdAt: Date }
  | { error: string }
> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return { error: "Not authenticated" };
  const plaintext = randomBytes(32).toString("hex");
  const tokenHash = hashToken(plaintext);
  const prefix = plaintext.slice(0, 4);
  const suffix = plaintext.slice(-4);
  const record = await prisma.apiToken.create({
    data: {
      userId,
      name: name.trim() || "Default",
      tokenHash,
      tokenPrefix: prefix,
      tokenSuffix: suffix,
    },
  });
  return { token: plaintext, id: record.id, name: record.name, createdAt: record.createdAt };
}

export async function listApiTokens(): Promise<
  { id: string; name: string; tokenPrefix: string | null; tokenSuffix: string | null; createdAt: Date; lastUsedAt: Date | null }[]
> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return [];
  const list = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, tokenPrefix: true, tokenSuffix: true, createdAt: true, lastUsedAt: true },
  });
  return list;
}

export async function revokeApiToken(id: string): Promise<{ ok: true } | { error: string }> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return { error: "Not authenticated" };
  await prisma.apiToken.deleteMany({ where: { id, userId } });
  return { ok: true };
}
