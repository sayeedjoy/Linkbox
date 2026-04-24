"use server";

import { randomBytes } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, apiTokens } from "@/lib/db";
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
  const [record] = await db
    .insert(apiTokens)
    .values({
      userId,
      name: name.trim() || "Default",
      tokenHash,
      tokenPrefix: prefix,
      tokenSuffix: suffix,
    })
    .returning({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt });
  return { token: plaintext, id: record.id, name: record.name, createdAt: record.createdAt };
}

export async function listApiTokens(): Promise<
  { id: string; name: string; tokenPrefix: string | null; tokenSuffix: string | null; createdAt: Date; lastUsedAt: Date | null }[]
> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return [];
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      tokenSuffix: apiTokens.tokenSuffix,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt));
}

export async function revokeApiToken(id: string): Promise<{ ok: true } | { error: string }> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return { error: "Not authenticated" };
  await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
  return { ok: true };
}
