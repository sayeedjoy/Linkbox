ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "aiProvider" text DEFAULT 'openrouter' NOT NULL;
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "aiModel" text DEFAULT 'google/gemini-2.0-flash-001' NOT NULL;
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "groqApiKey" text;
