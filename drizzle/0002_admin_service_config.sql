ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "openrouterApiKey" text;
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "resendApiKey" text;
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "resendFromEmail" text;
