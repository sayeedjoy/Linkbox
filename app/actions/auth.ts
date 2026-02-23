"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
