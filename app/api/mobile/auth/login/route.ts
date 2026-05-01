import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, users, apiTokens, subscriptionPlans } from "@/lib/db";
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

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image, password: users.password, bannedUntil: users.bannedUntil })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

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

  await db.transaction(async (tx) => {
    await tx.delete(apiTokens).where(and(eq(apiTokens.userId, user.id), eq(apiTokens.name, tokenName)));
    await tx.insert(apiTokens).values({
      userId: user.id,
      name: tokenName,
      tokenHash,
      tokenPrefix,
      tokenSuffix,
      lastUsedAt: new Date(),
    });
  });

  const [entRow] = await db
    .select({
      autoGroupEnabled: users.autoGroupEnabled,
      aiGroupingAllowed: subscriptionPlans.aiGroupingAllowed,
      groupColoringAllowed: subscriptionPlans.groupColoringAllowed,
      apiQuotaPerDay: subscriptionPlans.apiQuotaPerDay,
      planSource: users.planSource,
      planSlug: subscriptionPlans.slug,
      planDisplayName: subscriptionPlans.displayName,
    })
    .from(users)
    .innerJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json(
    {
      token: plaintext,
      user: { id: user.id, email: user.email, name: user.name, image: user.image },
      entitlements: entRow
        ? {
            autoGroupEnabled: entRow.autoGroupEnabled,
            aiGroupingAllowed: entRow.aiGroupingAllowed,
            groupColoringAllowed: entRow.groupColoringAllowed,
            apiQuotaPerDay: entRow.apiQuotaPerDay,
            planSource: entRow.planSource,
            plan: { slug: entRow.planSlug, displayName: entRow.planDisplayName },
          }
        : undefined,
    },
    { status: 200 }
  );
}
