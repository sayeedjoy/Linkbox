import { NextResponse } from "next/server";

// [P4] RFC 9728 — OAuth 2.0 Protected Resource Metadata.
// The LinkArena API accepts bearer API tokens via the Authorization header
// (`Authorization: Bearer <token>`), so it is a genuine protected resource.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkarena.app";

export function GET() {
  return NextResponse.json(
    {
      resource: `${SITE_URL}/api`,
      authorization_servers: [SITE_URL],
      bearer_methods_supported: ["header"],
      scopes_supported: [
        "bookmarks:read",
        "bookmarks:write",
        "groups:read",
        "groups:write",
      ],
      resource_documentation: `${SITE_URL}/support`,
    },
    { headers: { "Cache-Control": "public, max-age=3600, must-revalidate" } }
  );
}
