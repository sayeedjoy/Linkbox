"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

export async function register(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) throw new Error("User already exists");
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      password: hashed,
      name: name?.trim() || null,
    },
  });
}

export async function deleteAccount(): Promise<{ ok: true } | { error: string }> {
  const userId = await currentUserId();
  if (!userId) return { error: "Not authenticated" };
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
