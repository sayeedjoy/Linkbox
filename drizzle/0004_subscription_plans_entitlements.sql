CREATE TABLE "SubscriptionPlan" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"displayName" text NOT NULL,
	"googlePlayProductId" text,
	"aiGroupingAllowed" boolean DEFAULT true NOT NULL,
	"groupColoringAllowed" boolean DEFAULT true NOT NULL,
	"apiQuotaPerDay" integer,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "SubscriptionPlan_slug_unique" UNIQUE("slug"),
	CONSTRAINT "SubscriptionPlan_googlePlayProductId_unique" UNIQUE("googlePlayProductId")
);
--> statement-breakpoint
INSERT INTO "SubscriptionPlan" ("id", "slug", "displayName", "googlePlayProductId", "aiGroupingAllowed", "groupColoringAllowed", "apiQuotaPerDay", "sortOrder") VALUES
	('plan_seed_free00000001', 'free', 'Free', NULL, true, true, NULL, 0),
	('plan_seed_premium00002', 'premium', 'Pro', NULL, true, true, NULL, 1);
--> statement-breakpoint
CREATE TABLE "ApiUsageDaily" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"day" date NOT NULL,
	"requestCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserPlaySubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"purchaseToken" text NOT NULL,
	"expiryTime" timestamp (3),
	"autoRenewing" boolean DEFAULT false NOT NULL,
	"lastVerifiedAt" timestamp (3),
	"rawPayload" text,
	CONSTRAINT "UserPlaySubscription_purchaseToken_unique" UNIQUE("purchaseToken")
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "subscriptionPlanId" text;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "planSource" text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
UPDATE "User" SET "subscriptionPlanId" = 'plan_seed_free00000001' WHERE "subscriptionPlanId" IS NULL;
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "subscriptionPlanId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_subscriptionPlanId_SubscriptionPlan_id_fk" FOREIGN KEY ("subscriptionPlanId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ApiUsageDaily" ADD CONSTRAINT "ApiUsageDaily_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserPlaySubscription" ADD CONSTRAINT "UserPlaySubscription_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ApiUsageDaily_userId_day_key" ON "ApiUsageDaily" USING btree ("userId","day");
