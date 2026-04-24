import "dotenv/config";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

type DrizzleDB = NodePgDatabase<typeof schema>;

declare global {
  var __linkArenaDb: DrizzleDB | undefined;
}

function createDb(): DrizzleDB {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Create a .env file (see .env.example) and set DATABASE_URL to your PostgreSQL connection string."
    );
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

function getDb(): DrizzleDB {
  if (!globalThis.__linkArenaDb) {
    globalThis.__linkArenaDb = createDb();
  }
  return globalThis.__linkArenaDb;
}

const db = new Proxy({} as DrizzleDB, {
  get(_target, property, receiver) {
    const client = getDb();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as DrizzleDB;

export { db };
export * from "@/db/schema";
