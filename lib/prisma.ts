import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type PrismaClient as PrismaClientType } from "../app/generated/prisma/client";

declare global {
  var __linkArenaPrisma: PrismaClientType | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Create a .env file (see .env.example) and set DATABASE_URL to your PostgreSQL connection string."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!globalThis.__linkArenaPrisma) {
    globalThis.__linkArenaPrisma = createPrismaClient();
  }

  return globalThis.__linkArenaPrisma;
}

const prisma = new Proxy({} as PrismaClientType, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClientType;

export { prisma };
