CREATE TABLE "UserPlayPurchaseEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"transactionId" text,
	"purchaseToken" text NOT NULL,
	"productId" text NOT NULL,
	"purchaseDate" timestamp (3) NOT NULL,
	"expiryDate" timestamp (3),
	"rawReceipt" text NOT NULL,
	"verificationSource" text DEFAULT 'play_api' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserPlaySubscription" ADD COLUMN "transactionId" text;--> statement-breakpoint
ALTER TABLE "UserPlaySubscription" ADD COLUMN "purchaseDate" timestamp (3);--> statement-breakpoint
ALTER TABLE "UserPlayPurchaseEvent" ADD CONSTRAINT "UserPlayPurchaseEvent_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "UserPlayPurchaseEvent_userId_productId_idx" ON "UserPlayPurchaseEvent" USING btree ("userId","productId");--> statement-breakpoint
CREATE INDEX "UserPlayPurchaseEvent_purchaseToken_idx" ON "UserPlayPurchaseEvent" USING btree ("purchaseToken");--> statement-breakpoint
CREATE INDEX "UserPlayPurchaseEvent_transactionId_idx" ON "UserPlayPurchaseEvent" USING btree ("transactionId");