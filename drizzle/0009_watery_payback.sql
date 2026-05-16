CREATE TABLE "ApiUsageMonthly" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"month" text NOT NULL,
	"requestCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP TABLE "ApiUsageDaily" CASCADE;--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" ADD COLUMN "bookmarkQuotaPerMonth" integer;--> statement-breakpoint
ALTER TABLE "ApiUsageMonthly" ADD CONSTRAINT "ApiUsageMonthly_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ApiUsageMonthly_userId_month_key" ON "ApiUsageMonthly" USING btree ("userId","month");--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" DROP COLUMN "bookmarkQuotaPerDay";