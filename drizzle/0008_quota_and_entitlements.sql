ALTER TABLE "SubscriptionPlan" ADD COLUMN "browserBulkImportAllowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" ADD COLUMN "browserRealtimeSyncAllowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Preserve prior entitlements: any plan that previously disallowed browser import keeps both new flags off.
-- Admins can opt plans into realtime sync explicitly from the admin panel after migration.
UPDATE "SubscriptionPlan" SET "browserBulkImportAllowed" = "browserImportAllowed", "browserRealtimeSyncAllowed" = "browserImportAllowed";--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" DROP COLUMN "browserImportAllowed";--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" RENAME COLUMN "apiQuotaPerDay" TO "bookmarkQuotaPerDay";
