import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users, apiTokens, subscriptionPlans } from "@/lib/db";
import { getFreePlanId } from "@/lib/plan-entitlements";
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

export function isPgUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return (error as { code?: string }).code === "23505";
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

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
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
    const freePlanId = await getFreePlanId();
    createdUser = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email, password: hashedPassword, name, subscriptionPlanId: freePlanId })
        .returning({ id: users.id, email: users.email, name: users.name, image: users.image });

      await tx.insert(apiTokens).values({
        userId: user.id,
        name: tokenName,
        tokenHash,
        tokenPrefix,
        tokenSuffix,
        lastUsedAt: new Date(),
      });

      return user;
    });
  } catch (error) {
    if (isPgUniqueConstraintError(error)) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }
    throw error;
  }

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
    .where(eq(users.id, createdUser.id))
    .limit(1);

  return NextResponse.json(
    {
      token: plaintext,
      user: createdUser,
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
    { status: 201 }
  );
}
