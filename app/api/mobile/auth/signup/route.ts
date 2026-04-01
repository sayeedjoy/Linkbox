import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/api-auth";
import { isPublicSignupEnabled } from "@/lib/app-config";

type SignupBody = {
  email?: string;
  password?: string;
  name?: string;
  tokenName?: string;
};

export function isSignupBody(body: unknown): body is SignupBody {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return (error as { code?: string }).code === "P2002";
}

function parseTokenName(input: unknown): string {
  if (typeof input !== "string") return "Android App";
  const trimmed = input.trim();
  if (!trimmed) return "Android App";
  return trimmed.slice(0, 100);
}

function parseName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isSignupBody(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const payload = body;

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const publicSignupEnabled = await isPublicSignupEnabled();
  if (!publicSignupEnabled) {
    return NextResponse.json({ error: "Public signups are disabled" }, { status: 403 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const tokenName = parseTokenName(payload.tokenName);
  const name = parseName(payload.name);

  const plaintext = randomBytes(32).toString("hex");
  const tokenHash = hashToken(plaintext);
  const tokenPrefix = plaintext.slice(0, 4);
  const tokenSuffix = plaintext.slice(-4);

  let createdUser: { id: string; email: string; name: string | null; image: string | null };
  try {
    createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: { id: true, email: true, name: true, image: true },
      });

      await tx.apiToken.create({
        data: {
          userId: user.id,
          name: tokenName,
          tokenHash,
          tokenPrefix,
          tokenSuffix,
          lastUsedAt: new Date(),
        },
      });

      return user;
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json(
    {
      token: plaintext,
      user: createdUser,
    },
    { status: 201 }
  );
}
