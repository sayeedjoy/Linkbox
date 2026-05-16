import { NextResponse } from "next/server";
import { consumeBookmarkQuota } from "@/lib/api-quota";
import { getPlanFeaturesForUser, type PlanFeaturesForUser } from "@/lib/plan-entitlements";

export type BookmarkWriteSource =
  | "manual"
  | "extension_save"
  | "browser_realtime"
  | "browser_import"
  | "json_import";

export type GuardOptions = {
  source: BookmarkWriteSource;
  units: number;
  /** Pass-through if the caller already loaded the plan. */
  plan?: PlanFeaturesForUser;
  /** Optional CORS headers to merge into the error response. */
  headers?: Record<string, string>;
};

export type GuardResult =
  | { ok: true; plan: PlanFeaturesForUser; remaining: number | null }
  | { ok: false; response: NextResponse };

function isBulkImportGated(source: BookmarkWriteSource): boolean {
  return source === "browser_import";
}

function isRealtimeGated(source: BookmarkWriteSource): boolean {
  return source === "browser_realtime";
}

export async function guardBookmarkWrite(
  userId: string,
  opts: GuardOptions
): Promise<GuardResult> {
  const plan = opts.plan ?? (await getPlanFeaturesForUser(userId));
  const headers = opts.headers ?? {};

  if (isBulkImportGated(opts.source) && !plan.browserBulkImportAllowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Bulk browser bookmark import requires a Pro plan." },
        { status: 403, headers }
      ),
    };
  }

  if (isRealtimeGated(opts.source) && !plan.browserRealtimeSyncAllowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Browser auto-sync is disabled for your plan." },
        { status: 403, headers }
      ),
    };
  }

  const quota = await consumeBookmarkQuota(userId, opts.units, plan);
  if (!quota.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Monthly bookmark limit reached", limit: quota.limit, resetsAt: quota.resetsAt },
        { status: 429, headers }
      ),
    };
  }

  return { ok: true, plan, remaining: quota.remaining };
}
