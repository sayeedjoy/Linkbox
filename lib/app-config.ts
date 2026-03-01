import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AppConfig = {
  id: number;
  publicSignupEnabled: boolean;
};

export class AppConfigMigrationRequiredError extends Error {
  constructor() {
    super(
      "Public signup settings are unavailable until the latest database migration is applied. Run Prisma migrations and try again."
    );
    this.name = "AppConfigMigrationRequiredError";
  }
}

const APP_CONFIG_ID = 1;

const DEFAULT_CONFIG: AppConfig = {
  id: APP_CONFIG_ID,
  publicSignupEnabled: true,
};

type AppConfigQueryClient = Pick<typeof prisma, "$queryRaw">;

function isAppConfigMissingError(e: unknown): boolean {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: string }).code;
    if (code === "P2010" || code === "P2021") return true;
  }

  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('relation "AppConfig" does not exist');
}

async function queryAppConfig(db: AppConfigQueryClient): Promise<AppConfig> {
  const rows = await db.$queryRaw<AppConfig[]>(
    Prisma.sql`
      SELECT "id", "publicSignupEnabled"
      FROM "AppConfig"
      WHERE "id" = ${APP_CONFIG_ID}
      LIMIT 1
    `
  );

  return rows[0] ?? DEFAULT_CONFIG;
}

export async function getAppConfig(): Promise<AppConfig> {
  try {
    return await queryAppConfig(prisma);
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
  db: AppConfigQueryClient
): Promise<boolean> {
  try {
    const config = await queryAppConfig(db);
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
    const rows = await prisma.$queryRaw<AppConfig[]>(
      Prisma.sql`
        INSERT INTO "AppConfig" ("id", "publicSignupEnabled")
        VALUES (${APP_CONFIG_ID}, ${enabled})
        ON CONFLICT ("id")
        DO UPDATE SET "publicSignupEnabled" = EXCLUDED."publicSignupEnabled"
        RETURNING "id", "publicSignupEnabled"
      `
    );

    return rows[0] ?? { id: APP_CONFIG_ID, publicSignupEnabled: enabled };
  } catch (e) {
    if (isAppConfigMissingError(e)) {
      throw new AppConfigMigrationRequiredError();
    }

    throw e;
  }
}
