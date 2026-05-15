ALTER TABLE "Bookmark" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "SubscriptionPlan" ADD COLUMN "browserImportAllowed" boolean DEFAULT false NOT NULL;