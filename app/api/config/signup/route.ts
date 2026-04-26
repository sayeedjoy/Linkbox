import { isPublicSignupEnabled } from "@/lib/app-config";

export async function GET() {
  const enabled = await isPublicSignupEnabled();
  return Response.json(
    { enabled },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
