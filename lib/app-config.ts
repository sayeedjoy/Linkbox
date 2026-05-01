import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";

export type AppConfig = {
  id: number;
  publicSignupEnabled: boolean;
  openrouterApiKey: string | null;
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

const DEFAULT_CONFIG: AppConfig = {
  id: APP_CONFIG_ID,
  publicSignupEnabled: true,
  openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
  resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
  resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || null,
};

type AnyDb = NodePgDatabase<typeof schema>;

function isAppConfigMissingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes('relation "AppConfig" does not exist') ||
    msg.includes('column "openrouterApiKey" does not exist') ||
    msg.includes('column "resendApiKey" does not exist') ||
    msg.includes('column "resendFromEmail" does not exist')
  );
}

async function queryAppConfig(client: AnyDb): Promise<AppConfig> {
  const rows = await client.execute<AppConfig>(
    sql`SELECT "id", "publicSignupEnabled", "openrouterApiKey", "resendApiKey", "resendFromEmail" FROM "AppConfig" WHERE "id" = ${APP_CONFIG_ID} LIMIT 1`
  );
  const row = rows.rows[0] as AppConfig | undefined;
  if (!row) return DEFAULT_CONFIG;
  return {
    ...row,
    openrouterApiKey: row.openrouterApiKey ?? DEFAULT_CONFIG.openrouterApiKey,
    resendApiKey: row.resendApiKey ?? DEFAULT_CONFIG.resendApiKey,
    resendFromEmail: row.resendFromEmail ?? DEFAULT_CONFIG.resendFromEmail,
  };
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
      sql`INSERT INTO "AppConfig" ("id", "publicSignupEnabled", "openrouterApiKey", "resendApiKey", "resendFromEmail")
          VALUES (${APP_CONFIG_ID}, ${enabled}, ${DEFAULT_CONFIG.openrouterApiKey}, ${DEFAULT_CONFIG.resendApiKey}, ${DEFAULT_CONFIG.resendFromEmail})
          ON CONFLICT ("id") DO UPDATE SET "publicSignupEnabled" = EXCLUDED."publicSignupEnabled"
          RETURNING "id", "publicSignupEnabled", "openrouterApiKey", "resendApiKey", "resendFromEmail"`
    );
    return (rows.rows[0] as AppConfig | undefined) ?? { ...DEFAULT_CONFIG, publicSignupEnabled: enabled };
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }
    throw e;
  }
}

export type ServiceConfigForAdmin = {
  openrouterConfigured: boolean;
  resendConfigured: boolean;
  resendFromEmail: string;
};

export async function getServiceConfigForAdmin(): Promise<ServiceConfigForAdmin> {
  const config = await getAppConfig();

  return {
    openrouterConfigured: !!config.openrouterApiKey,
    resendConfigured: !!config.resendApiKey,
    resendFromEmail: config.resendFromEmail ?? "",
  };
}

export async function setServiceConfig(input: {
  openrouterApiKey?: string | null;
  clearOpenrouterApiKey?: boolean;
  resendApiKey?: string | null;
  clearResendApiKey?: boolean;
  resendFromEmail?: string | null;
}): Promise<AppConfig> {
  const openrouterApiKey =
    input.clearOpenrouterApiKey === true
      ? null
      : input.openrouterApiKey?.trim() || undefined;
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
      sql`INSERT INTO "AppConfig" ("id", "publicSignupEnabled", "openrouterApiKey", "resendApiKey", "resendFromEmail")
          VALUES (${APP_CONFIG_ID}, ${DEFAULT_CONFIG.publicSignupEnabled}, ${openrouterApiKey ?? null}, ${resendApiKey ?? null}, ${resendFromEmail ?? null})
          ON CONFLICT ("id") DO UPDATE SET
            "openrouterApiKey" = CASE
              WHEN ${input.clearOpenrouterApiKey === true} THEN NULL
              WHEN ${openrouterApiKey !== undefined} THEN ${openrouterApiKey ?? null}
              ELSE "AppConfig"."openrouterApiKey"
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
          RETURNING "id", "publicSignupEnabled", "openrouterApiKey", "resendApiKey", "resendFromEmail"`
    );
    return (rows.rows[0] as AppConfig | undefined) ?? DEFAULT_CONFIG;
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }
    throw e;
  }
}
