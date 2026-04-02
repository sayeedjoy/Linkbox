import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/api-auth";

type LoginBody = {
  email?: string;
  password?: string;
  tokenName?: string;
};

function parseTokenName(input: unknown): string {
  if (typeof input !== "string") return "Android App";
  const trimmed = input.trim();
  if (!trimmed) return "Android App";
  return trimmed.slice(0, 100);
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, image: true, password: true, bannedUntil: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.bannedUntil && user.bannedUntil > new Date()) {
    return NextResponse.json({ error: "Account is temporarily suspended" }, { status: 403 });
  }

  const tokenName = parseTokenName(body.tokenName);

  const plaintext = randomBytes(32).toString("hex");
  const tokenHash = hashToken(plaintext);
  const tokenPrefix = plaintext.slice(0, 4);
  const tokenSuffix = plaintext.slice(-4);

  await prisma.$transaction(async (tx) => {
    await tx.apiToken.deleteMany({
      where: { userId: user.id, name: tokenName },
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
  });

  return NextResponse.json(
    {
      token: plaintext,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    },
    { status: 200 }
  );
}
