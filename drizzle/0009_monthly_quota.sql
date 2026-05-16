ALTER TABLE "SubscriptionPlan" RENAME COLUMN "bookmarkQuotaPerDay" TO "bookmarkQuotaPerMonth";--> statement-breakpoint
ALTER TABLE "ApiUsageDaily" RENAME TO "ApiUsageMonthly";--> statement-breakpoint
ALTER INDEX "ApiUsageDaily_userId_day_key" RENAME TO "ApiUsageMonthly_userId_month_key";--> statement-breakpoint
-- Counter semantics change from per-day to per-month; drop existing counters so users start with a fresh monthly bucket.
TRUNCATE TABLE "ApiUsageMonthly";--> statement-breakpoint
ALTER TABLE "ApiUsageMonthly" ALTER COLUMN "day" TYPE text USING to_char("day", 'YYYY-MM');--> statement-breakpoint
ALTER TABLE "ApiUsageMonthly" RENAME COLUMN "day" TO "month";
