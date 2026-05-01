CREATE INDEX "Bookmark_userId_idx" ON "Bookmark" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Bookmark_createdAt_idx" ON "Bookmark" USING btree ("createdAt");