import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";

export type AppConfig = {
  id: number;
  publicSignupEnabled: boolean;
  aiProvider: "openrouter" | "groq";
  aiModel: string;
  openrouterApiKey: string | null;
  groqApiKey: string | null;
  resendApiKey: string | null;
  resendFromEmail: string | null;
};

export class AppConfigMigrationRequiredError extends Error {
  constructor() {
    super(
      "Application settings are unavailable until the latest database migration is applied. Run migrations and try again."
    );
    this.name = "AppConfigMigrationRequiredError";
  }
}

const APP_CONFIG_ID = 1;
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const ENV_AI_PROVIDER = process.env.AI_PROVIDER?.trim().toLowerCase();
const DEFAULT_AI_PROVIDER: AppConfig["aiProvider"] =
  ENV_AI_PROVIDER === "groq" ? "groq" : "openrouter";
const DEFAULT_AI_MODEL =
  process.env.AI_MODEL?.trim() ||
  (DEFAULT_AI_PROVIDER === "groq"
    ? DEFAULT_GROQ_MODEL
    : DEFAULT_OPENROUTER_MODEL);

const DEFAULT_CONFIG: AppConfig = {
  id: APP_CONFIG_ID,
  publicSignupEnabled: true,
  aiProvider: DEFAULT_AI_PROVIDER,
  aiModel: DEFAULT_AI_MODEL,
  openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
  groqApiKey: process.env.GROQ_API_KEY?.trim() || null,
  resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
  resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || null,
};

type AnyDb = NodePgDatabase<typeof schema>;

function withResolvedDefaults(config: AppConfig): AppConfig {
  return {
    ...config,
    aiProvider:
      config.aiProvider === "groq" || config.aiProvider === "openrouter"
        ? config.aiProvider
        : DEFAULT_CONFIG.aiProvider,
    aiModel: config.aiModel?.trim() || DEFAULT_CONFIG.aiModel,
    openrouterApiKey: config.openrouterApiKey ?? DEFAULT_CONFIG.openrouterApiKey,
    groqApiKey: config.groqApiKey ?? DEFAULT_CONFIG.groqApiKey,
    resendApiKey: config.resendApiKey ?? DEFAULT_CONFIG.resendApiKey,
    resendFromEmail: config.resendFromEmail ?? DEFAULT_CONFIG.resendFromEmail,
  };
}

function isAppConfigMissingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes('relation "AppConfig" does not exist') ||
    msg.includes('column "aiProvider" does not exist') ||
    msg.includes('column "aiModel" does not exist') ||
    msg.includes('column "openrouterApiKey" does not exist') ||
    msg.includes('column "groqApiKey" does not exist') ||
    msg.includes('column "resendApiKey" does not exist') ||
    msg.includes('column "resendFromEmail" does not exist')
  );
}

async function queryAppConfig(client: AnyDb): Promise<AppConfig> {
  const rows = await client.execute<AppConfig>(
    sql`SELECT "id", "publicSignupEnabled", "aiProvider", "aiModel", "openrouterApiKey", "groqApiKey", "resendApiKey", "resendFromEmail" FROM "AppConfig" WHERE "id" = ${APP_CONFIG_ID} LIMIT 1`
  );
  const row = rows.rows[0] as AppConfig | undefined;
  if (!row) return DEFAULT_CONFIG;
  return withResolvedDefaults(row);
}

export async function getAppConfig(): Promise<AppConfig> {
  await connection();
  try {
    return await queryAppConfig(db);
  } catch (e) {
    if (isAppConfigMissingError(e)) return DEFAULT_CONFIG;
    throw e;
  }
}

export async function isPublicSignupEnabled(): Promise<boolean> {
  const config = await getAppConfig();
  return config.publicSignupEnabled;
}

export async function isPublicSignupEnabledForClient(
  client: AnyDb
): Promise<boolean> {
  try {
    const config = await queryAppConfig(client);
    return config.publicSignupEnabled;
  } catch (e) {
    if (isAppConfigMissingError(e)) return DEFAULT_CONFIG.publicSignupEnabled;
    throw e;
  }
}

export async function setPublicSignupEnabled(
  enabled: boolean
): Promise<AppConfig> {
  try {
    const rows = await db.execute<AppConfig>(
      sql`INSERT INTO "AppConfig" ("id", "publicSignupEnabled", "aiProvider", "aiModel", "openrouterApiKey", "groqApiKey", "resendApiKey", "resendFromEmail")
          VALUES (${APP_CONFIG_ID}, ${enabled}, ${DEFAULT_CONFIG.aiProvider}, ${DEFAULT_CONFIG.aiModel}, ${DEFAULT_CONFIG.openrouterApiKey}, ${DEFAULT_CONFIG.groqApiKey}, ${DEFAULT_CONFIG.resendApiKey}, ${DEFAULT_CONFIG.resendFromEmail})
          ON CONFLICT ("id") DO UPDATE SET "publicSignupEnabled" = EXCLUDED."publicSignupEnabled"
          RETURNING "id", "publicSignupEnabled", "aiProvider", "aiModel", "openrouterApiKey", "groqApiKey", "resendApiKey", "resendFromEmail"`
    );
    const row = (rows.rows[0] as AppConfig | undefined) ?? {
      ...DEFAULT_CONFIG,
      publicSignupEnabled: enabled,
    };
    return withResolvedDefaults(row);
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }
    throw e;
  }
}

export type ServiceConfigForAdmin = {
  aiProvider: "openrouter" | "groq";
  aiModel: string;
  openrouterConfigured: boolean;
  groqConfigured: boolean;
  resendConfigured: boolean;
  resendFromEmail: string;
};

export async function getServiceConfigForAdmin(): Promise<ServiceConfigForAdmin> {
  const config = await getAppConfig();

  return {
    aiProvider: config.aiProvider,
    aiModel: config.aiModel,
    openrouterConfigured: !!config.openrouterApiKey,
    groqConfigured: !!config.groqApiKey,
    resendConfigured: !!config.resendApiKey,
    resendFromEmail: config.resendFromEmail ?? "",
  };
}

export async function setServiceConfig(input: {
  aiProvider?: "openrouter" | "groq";
  aiModel?: string | null;
  openrouterApiKey?: string | null;
  clearOpenrouterApiKey?: boolean;
  groqApiKey?: string | null;
  clearGroqApiKey?: boolean;
  resendApiKey?: string | null;
  clearResendApiKey?: boolean;
  resendFromEmail?: string | null;
}): Promise<AppConfig> {
  const aiProvider =
    input.aiProvider === "groq" || input.aiProvider === "openrouter"
      ? input.aiProvider
      : undefined;
  const aiModel =
    input.aiModel === undefined
      ? undefined
      : input.aiModel?.trim() || undefined;
  const openrouterApiKey =
    input.clearOpenrouterApiKey === true
      ? null
      : input.openrouterApiKey?.trim() || undefined;
  const groqApiKey =
    input.clearGroqApiKey === true ? null : input.groqApiKey?.trim() || undefined;
  const resendApiKey =
    input.clearResendApiKey === true
      ? null
      : input.resendApiKey?.trim() || undefined;
  const resendFromEmail =
    input.resendFromEmail === undefined
      ? undefined
      : input.resendFromEmail?.trim() || null;

  try {
    const rows = await db.execute<AppConfig>(
      sql`INSERT INTO "AppConfig" ("id", "publicSignupEnabled", "aiProvider", "aiModel", "openrouterApiKey", "groqApiKey", "resendApiKey", "resendFromEmail")
          VALUES (${APP_CONFIG_ID}, ${DEFAULT_CONFIG.publicSignupEnabled}, ${aiProvider ?? DEFAULT_CONFIG.aiProvider}, ${aiModel ?? DEFAULT_CONFIG.aiModel}, ${openrouterApiKey ?? null}, ${groqApiKey ?? null}, ${resendApiKey ?? null}, ${resendFromEmail ?? null})
          ON CONFLICT ("id") DO UPDATE SET
            "aiProvider" = CASE
              WHEN ${aiProvider !== undefined} THEN ${aiProvider ?? null}
              ELSE "AppConfig"."aiProvider"
            END,
            "aiModel" = CASE
              WHEN ${aiModel !== undefined} THEN ${aiModel ?? null}
              ELSE "AppConfig"."aiModel"
            END,
            "openrouterApiKey" = CASE
              WHEN ${input.clearOpenrouterApiKey === true} THEN NULL
              WHEN ${openrouterApiKey !== undefined} THEN ${openrouterApiKey ?? null}
              ELSE "AppConfig"."openrouterApiKey"
            END,
            "groqApiKey" = CASE
              WHEN ${input.clearGroqApiKey === true} THEN NULL
              WHEN ${groqApiKey !== undefined} THEN ${groqApiKey ?? null}
              ELSE "AppConfig"."groqApiKey"
            END,
            "resendApiKey" = CASE
              WHEN ${input.clearResendApiKey === true} THEN NULL
              WHEN ${resendApiKey !== undefined} THEN ${resendApiKey ?? null}
              ELSE "AppConfig"."resendApiKey"
            END,
            "resendFromEmail" = CASE
              WHEN ${resendFromEmail !== undefined} THEN ${resendFromEmail ?? null}
              ELSE "AppConfig"."resendFromEmail"
            END
          RETURNING "id", "publicSignupEnabled", "aiProvider", "aiModel", "openrouterApiKey", "groqApiKey", "resendApiKey", "resendFromEmail"`
    );
    return withResolvedDefaults((rows.rows[0] as AppConfig | undefined) ?? DEFAULT_CONFIG);
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }
    throw e;
  }
}
