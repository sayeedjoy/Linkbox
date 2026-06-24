import { NextResponse } from "next/server";

// [P4] RFC 8414 — OAuth 2.0 Authorization Server Metadata.
// LinkArena is not a full OAuth authorization-code server; it mints bearer API
// tokens from credentials. This document describes that token-based flow in the
// RFC 8414 shape so agents can discover how to obtain and revoke a token.
// Only endpoints that actually exist are advertised.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://linkarena.app";

export function GET() {
  return NextResponse.json(
    {
      issuer: SITE_URL,
      // Exchanges email + password for a bearer API token (Resource Owner
      // Password Credentials style).
      token_endpoint: `${SITE_URL}/api/mobile/auth/login`,
      // Revokes the active bearer token.
      revocation_endpoint: `${SITE_URL}/api/mobile/auth/logout`,
      token_endpoint_auth_methods_supported: ["none"],
      grant_types_supported: ["password"],
      response_types_supported: ["token"],
      scopes_supported: [
        "bookmarks:read",
        "bookmarks:write",
        "groups:read",
        "groups:write",
      ],
      service_documentation: `${SITE_URL}/support`,
      ui_locales_supported: ["en-US"],
    },
    { headers: { "Cache-Control": "public, max-age=3600, must-revalidate" } }
  );
}
