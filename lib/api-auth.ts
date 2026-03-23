import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthSession } from "@/lib/auth";

const TOKEN_LAST_USED_TOUCH_INTERVAL_MS = 10 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function extractTokenFromAuthorizationHeader(authHeader: string | null): string | null {
  const raw = authHeader?.trim();
  if (!raw) return null;

  // Accept common token auth schemes case-insensitively.
  const schemeMatch = raw.match(/^([A-Za-z]+)\s+(.+)$/);
  if (schemeMatch) {
    const scheme = schemeMatch[1]?.toLowerCase();
    const token = schemeMatch[2]?.trim();
    if (!token) return null;
    if (scheme === "bearer" || scheme === "token") return token;
    return null;
  }

  // Backward-compatible fallback for clients sending raw token in Authorization.
  if (raw.includes(" ")) return null;
  return raw;
}

export async function userIdFromBearerToken(authHeader: string | null): Promise<string | null> {
  const token = extractTokenFromAuthorizationHeader(authHeader);
  if (!token) return null;
  const hash = hashToken(token);
  const record = await prisma.apiToken.findFirst({
    where: { tokenHash: hash },
    select: { id: true, userId: true, lastUsedAt: true },
  });
  if (!record) return null;

  const shouldTouch =
    !record.lastUsedAt ||
    Date.now() - record.lastUsedAt.getTime() >= TOKEN_LAST_USED_TOUCH_INTERVAL_MS;
  if (shouldTouch) {
    void prisma.apiToken
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);
  }

  return record.userId;
}

export function isExtensionOrigin(origin: string | null): boolean {
  return Boolean(origin?.startsWith("chrome-extension://"));
}

export async function resolveApiUserId(
  request: Request,
  allowSessionFallback = true
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.trim()) {
    return userIdFromBearerToken(authHeader);
  }

  if (isExtensionOrigin(request.headers.get("Origin"))) {
    return null;
  }

  if (!allowSessionFallback) {
    return null;
  }

  const session = await getVerifiedAuthSession();
  return session?.user?.id ?? null;
}
