import { eq, and, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, apiUsageDaily } from "@/lib/db";
import { getPlanFeaturesForUser } from "@/lib/plan-entitlements";

export function utcDayString(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nextUtcMidnightIso(day: string): string {
  const [y, mo, da] = day.split("-").map(Number);
  const next = Date.UTC(y!, mo! - 1, da! + 1, 0, 0, 0, 0);
  return new Date(next).toISOString();
}

function stableLockKey(userId: string, day: string): number {
  let h = 0;
  const s = `${userId}:${day}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  const key = Math.abs(h);
  return key === 0 ? 1 : key;
}

export type ConsumeQuotaResult =
  | { ok: true; remaining: number | null }
  | { ok: false; limit: number; resetsAt: string };

type QuotaPlanFeatures = {
  bookmarkQuotaPerDay: number | null;
};

export async function consumeBookmarkQuota(
  userId: string,
  units: number,
  planOverride?: QuotaPlanFeatures
): Promise<ConsumeQuotaResult> {
  if (!Number.isInteger(units) || units < 0) {
    throw new Error(`consumeBookmarkQuota: units must be a non-negative integer (got ${units})`);
  }

  const plan = planOverride ?? (await getPlanFeaturesForUser(userId));
  const limit = plan.bookmarkQuotaPerDay;
  if (limit == null) return { ok: true, remaining: null };

  const day = utcDayString();
  const resetsAt = nextUtcMidnightIso(day);

  return db.transaction(async (tx) => {
    const lockKey = stableLockKey(userId, day);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

    const [row] = await tx
      .select({ requestCount: apiUsageDaily.requestCount })
      .from(apiUsageDaily)
      .where(and(eq(apiUsageDaily.userId, userId), eq(apiUsageDaily.day, day)))
      .limit(1);

    const current = row?.requestCount ?? 0;
    const nextCount = current + units;
    if (nextCount > limit) {
      return { ok: false, limit, resetsAt };
    }

    if (units === 0) return { ok: true, remaining: limit - current };

    if (!row) {
      await tx.insert(apiUsageDaily).values({
        id: createId(),
        userId,
        day,
        requestCount: units,
      });
    } else {
      await tx
        .update(apiUsageDaily)
        .set({ requestCount: nextCount })
        .where(and(eq(apiUsageDaily.userId, userId), eq(apiUsageDaily.day, day)));
    }

    return { ok: true, remaining: limit - nextCount };
  });
}

export async function consumeBookmarkQuotaOrThrow(
  userId: string,
  units: number,
  planOverride?: QuotaPlanFeatures
): Promise<void> {
  const r = await consumeBookmarkQuota(userId, units, planOverride);
  if (!r.ok) {
    throw new Error(`Daily bookmark limit reached (${r.limit}). Resets at ${r.resetsAt}.`);
  }
}
