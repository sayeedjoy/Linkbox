import { isPublicSignupEnabled } from "@/lib/app-config";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const enabled = await isPublicSignupEnabled();
  return Response.json(
    { enabled },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
