import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"];
const prismaCommand = process.argv.slice(2).join(" ");
const requiresDatabaseUrl = !prismaCommand.includes("generate");

if (requiresDatabaseUrl && !url?.trim()) {
  throw new Error(
    "DATABASE_URL is not set. Create a .env file (see .env.example) and set DATABASE_URL to your PostgreSQL connection string."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(url?.trim()
    ? {
        datasource: {
          url,
        },
      }
    : {}),
});
