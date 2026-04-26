import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";

export type AppConfig = {
  id: number;
  publicSignupEnabled: boolean;
};

export class AppConfigMigrationRequiredError extends Error {
  constructor() {
    super(
      "Public signup settings are unavailable until the latest database migration is applied. Run migrations and try again."
    );
    this.name = "AppConfigMigrationRequiredError";
  }
}

const APP_CONFIG_ID = 1;

const DEFAULT_CONFIG: AppConfig = {
  id: APP_CONFIG_ID,
  publicSignupEnabled: true,
};

type AnyDb = NodePgDatabase<typeof schema>;

function isAppConfigMissingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('relation "AppConfig" does not exist');
}

async function queryAppConfig(client: AnyDb): Promise<AppConfig> {
  const rows = await client.execute<AppConfig>(
    sql`SELECT "id", "publicSignupEnabled" FROM "AppConfig" WHERE "id" = ${APP_CONFIG_ID} LIMIT 1`
  );
  return (rows.rows[0] as AppConfig | undefined) ?? DEFAULT_CONFIG;
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
      sql`INSERT INTO "AppConfig" ("id", "publicSignupEnabled") VALUES (${APP_CONFIG_ID}, ${enabled}) ON CONFLICT ("id") DO UPDATE SET "publicSignupEnabled" = EXCLUDED."publicSignupEnabled" RETURNING "id", "publicSignupEnabled"`
    );
    return (rows.rows[0] as AppConfig | undefined) ?? { id: APP_CONFIG_ID, publicSignupEnabled: enabled };
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }
    throw e;
  }
}
