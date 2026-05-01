import type { Metadata } from "next";
import { connection } from "next/server";
import { BookmarkIcon, SmartphoneIcon, RadioIcon, KeyRoundIcon, FileJsonIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EndpointCard } from "@/components/admin/api-docs/endpoint-card";
import { BaseUrlBanner } from "@/components/admin/api-docs/base-url-banner";
import { PlanApiDocsSection } from "@/components/admin/api-docs/plan-api-section";

export const metadata: Metadata = { title: "API Reference" };

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default async function AdminApiDocsPage() {
  await connection();

  return (
    <div className="flex flex-col">
      <AdminPageHeader
        title="API Reference"
        description="All available REST endpoints"
      />

      <div className="flex-1 space-y-10 p-4 sm:p-6">
        <BaseUrlBanner />

        {/* -- Mobile Auth ------------------------------- */}
        <section className="space-y-3">
          <SectionHeader
            icon={KeyRoundIcon}
            title="Mobile Auth"
            description="Token-based authentication for mobile and third-party clients"
          />

          <EndpointCard
            method="POST"
            path="/api/mobile/auth/login"
            auth="none"
            description="Authenticate with email and password. Returns a long-lived Bearer token and user profile. If a token with the same name already exists, it is replaced."
            requestBody={`{
  "email": "user@example.com",
  "password": "secret",
  "tokenName": "My Android App"   // optional, default: "Android App"
}`}
            responseBody={`{
  "token": "a3f8c2...",
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "Jane",
    "image": null
  },
  "entitlements": {
    "autoGroupEnabled": false,
    "aiGroupingAllowed": true,
    "groupColoringAllowed": true,
    "apiQuotaPerDay": null,
    "planSource": "default",
    "plan": { "slug": "free", "displayName": "Free" }
  }
}`}
            notes={[
              "entitlements reflects the user's subscription plan (Free/Pro) and feature flags configured in Admin → Plans.",
              "Clients should refresh after billing verification or admin plan changes.",
            ]}
          />

          <EndpointCard
            method="POST"
            path="/api/mobile/auth/signup"
            auth="none"
            description="Register a new account and receive a Bearer token. Fails with 403 if public signup is disabled by the admin."
            requestBody={`{
  "email": "user@example.com",
  "password": "secret",
  "name": "Jane",               // optional
  "tokenName": "My Android App" // optional
}`}
            responseBody={`201 Created

{
  "token": "a3f8c2...",
  "user": { "id": "clx...", "email": "...", "name": "Jane", "image": null },
  "entitlements": {
    "autoGroupEnabled": false,
    "aiGroupingAllowed": true,
    "groupColoringAllowed": true,
    "apiQuotaPerDay": null,
    "planSource": "default",
    "plan": { "slug": "free", "displayName": "Free" }
  }
}`}
            notes={[
              "Returns 403 if public signup is disabled.",
              "Returns 409 if the email already exists.",
              "New accounts start on the Free plan unless changed by Play billing or an admin.",
            ]}
          />

          <EndpointCard
            method="POST"
            path="/api/mobile/auth/logout"
            auth="bearer"
            description="Revoke the current Bearer token. The token is permanently deleted from the database."
            responseBody={`{ "ok": true }`}
          />

          <EndpointCard
            method="POST"
            path="/api/mobile/auth/forgot-password"
            auth="none"
            description="Request a password-reset email. Always returns 200 to prevent user enumeration - no error is returned if the email does not exist."
            requestBody={`{ "email": "user@example.com" }`}
            responseBody={`{ "ok": true }`}
          />

          <EndpointCard
            method="POST"
            path="/api/mobile/auth/reset-password"
            auth="none"
            description="Complete a password reset using a token received by email."
            requestBody={`{
  "token": "reset-token-from-email",
  "newPassword": "newsecret"
}`}
            responseBody={`{ "ok": true }`}
            notes={["Returns 400 if the token is invalid or expired."]}
          />
        </section>

        <PlanApiDocsSection />

        {/* -- Bookmarks ---------------------------------- */}
        <section className="space-y-3">
          <SectionHeader
            icon={BookmarkIcon}
            title="Bookmarks"
            description="Create, update, and delete bookmarks — Bearer auth. Writes count toward the user's daily API quota when set on their plan (429 Too Many Requests with limit and resetsAt)."
          />

          <EndpointCard
            method="POST"
            path="/api/bookmarks"
            auth="bearer"
            description="Create a new bookmark. The server fetches Open Graph metadata for the URL automatically if title or description are omitted."
            requestBody={`{
  "url": "https://example.com",   // required
  "title": "Example",             // optional - overrides metadata
  "description": "A site",        // optional
  "groupId": "clx...",            // optional - null to leave ungrouped
  "faviconUrl": "https://..."     // optional
}`}
            responseBody={`{
  "id": "clx...",
  "url": "https://example.com",
  "title": "Example",
  "description": "A site",
  "faviconUrl": "https://...",
  "previewImageUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "groupId": null,
  "group": null
}`}
          />

          <EndpointCard
            method="PUT"
            path="/api/bookmarks"
            auth="bearer"
            description="Update an existing bookmark matched by URL. Only provided fields are changed - omit a field to leave it unchanged."
            requestBody={`{
  "url": "https://example.com",   // required - used to look up the bookmark
  "title": "New title",           // optional
  "description": "New desc",      // optional
  "groupId": "clx..." | null,     // optional
  "faviconUrl": "https://..."     // optional
}`}
            responseBody={`200 OK - updated bookmark object`}
            notes={["Returns 404 if no bookmark with that URL exists for the authenticated user."]}
          />

          <EndpointCard
            method="DELETE"
            path="/api/bookmarks"
            auth="bearer"
            description="Delete a bookmark by URL."
            requestBody={`{ "url": "https://example.com" }`}
            responseBody={`204 No Content`}
            notes={["Returns 404 if the bookmark does not exist."]}
          />

          <EndpointCard
            method="DELETE"
            path="/api/bookmarks/{bookmarkId}"
            auth="bearer"
            description="Delete a bookmark by its ID."
            params={[{ name: "bookmarkId", type: "string", description: "The cuid2 ID of the bookmark" }]}
            responseBody={`204 No Content`}
          />

          <EndpointCard
            method="POST"
            path="/api/bookmarks/{bookmarkId}"
            auth="bearer"
            description="Re-fetch and update Open Graph metadata (title, description, favicon, preview image) for an existing bookmark."
            params={[{ name: "bookmarkId", type: "string", description: "The cuid2 ID of the bookmark" }]}
            responseBody={`200 OK - refreshed bookmark object`}
            notes={[
              "Returns 404 if the bookmark does not exist.",
              "Returns 422 if the bookmark has no URL.",
            ]}
          />
        </section>

        {/* -- Sync & Export ------------------------------ */}
        <section className="space-y-3">
          <SectionHeader
            icon={FileJsonIcon}
            title="Sync & Export"
            description="Bulk data access for extension and mobile clients"
          />

          <EndpointCard
            method="GET"
            path="/api/sync"
            auth="bearer"
            description="Fetch bookmarks and groups in a single request. Supports cursor-based pagination for the initial sync of large libraries. Each successful GET consumes one unit of the user's daily API quota when configured."
            queryParams={[
              { name: "mode", type: "string", required: false, description: '"initial" fetches up to 150 bookmarks by default; omit for a full sync (up to 2000)' },
              { name: "cursor", type: "string", required: false, description: "Bookmark ID from the previous page's nextCursor to fetch the next page" },
              { name: "limit", type: "number", required: false, description: "Max bookmarks to return (1-2000, default varies by mode)" },
            ]}
            responseBody={`{
  "bookmarks": [
    {
      "id": "clx...",
      "url": "https://example.com",
      "title": "Example",
      "description": null,
      "faviconUrl": null,
      "previewImageUrl": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "group": "Dev Tools",
      "groupColor": "#6366f1",
      "groupId": "clx..."
    }
  ],
  "groups": [
    { "id": "clx...", "name": "Dev Tools", "color": "#6366f1", "order": 0,
      "_count": { "bookmarks": 12 } }
  ],
  "hasMore": true,
  "nextCursor": "clx..."
}`}
            notes={[
              "Returns 429 with { error, limit, resetsAt } when the daily quota is exceeded.",
              "Realtime SSE (/api/realtime/bookmarks) does not use this quota counter.",
            ]}
          />

          <EndpointCard
            method="GET"
            path="/api/export"
            auth="bearer"
            description="Download all bookmarks as a JSON file. Returns the same shape as /api/sync bookmarks but without pagination."
            responseBody={`Content-Disposition: attachment; filename="bookmarks.json"

[ { "id": "clx...", "url": "...", "title": "...", ... } ]`}
          />
        </section>

        {/* -- Realtime ----------------------------------- */}
        <section className="space-y-3">
          <SectionHeader
            icon={RadioIcon}
            title="Realtime"
            description="Server-Sent Events stream for live bookmark updates"
          />

          <EndpointCard
            method="GET"
            path="/api/realtime/bookmarks"
            auth="bearer"
            description="Opens a persistent SSE connection. The server emits events whenever bookmarks or groups change and sends a heartbeat ping every 20 seconds to keep the connection alive."
            queryParams={[
              { name: "lastEventId", type: "number", required: false, description: "Resume from this event counter to avoid re-processing already-seen events" },
            ]}
            responseBody={`Content-Type: text/event-stream

// Initial connection confirmation
id: 1
data: {"type":"bookmark.updated","entity":"bookmark","id":"initial","data":{"connected":true}}

// Change event
id: 2
data: {"type":"bookmark.created","entity":"bookmark","id":"clx...","data":{}}

// Heartbeat (keep-alive)
: ping`}
            notes={[
              "Event types: bookmark.created, bookmark.updated, bookmark.deleted, bookmark.category.updated, group.created, group.updated, group.deleted",
              "A polling fallback runs every 1.5 s server-side to catch changes from Server Actions.",
              "CORS allows chrome-extension:// origins.",
            ]}
          />
        </section>

        {/* -- Mobile (Public) ---------------------------- */}
        <section className="space-y-3">
          <SectionHeader
            icon={SmartphoneIcon}
            title="Mobile (Public)"
            description="Public endpoints for mobile app configuration - no authentication required"
          />

          <EndpointCard
            method="GET"
            path="/api/mobile/ads"
            auth="none"
            description="Returns the current AdMob configuration. Mobile apps should call this on launch to decide whether to initialise ads and which unit IDs to use."
            responseBody={`{
  "adsEnabled": true,
  "admob": {
    "android": {
      "appId": "ca-app-pub-XXXX~XXXX",
      "bannerId": "ca-app-pub-XXXX/XXXX",
      "interstitialId": "ca-app-pub-XXXX/XXXX",
      "appOpenId": "ca-app-pub-XXXX/XXXX",
      "rewardedId": "ca-app-pub-XXXX/XXXX"
    }
  }
}`}
            notes={[
              'When adsEnabled is false, suppress all ads regardless of the IDs present.',
              "IDs are null if not configured by the admin.",
            ]}
          />
        </section>
      </div>
    </div>
  );
}

