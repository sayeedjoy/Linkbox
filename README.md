# LinkBox

LinkBox is a full-stack bookmarking platform with two clients:
- Web app (Next.js) for full management workflows
- Chrome extension for fast capture and lightweight management

This README documents the whole application. Extension-specific implementation details are in [extension/README.md](C:/Users/User/Downloads/bookmark/bookmark/extension/README.md).

## Core Capabilities

- Save links and notes
- Auto-unfurl metadata (title, description, favicon, preview image)
- Group bookmarks with color and ordering
- Search and timeline views
- Edit, refresh metadata, and delete bookmarks
- Export bookmarks
- API token management for integrations/extension
- Realtime sync across active clients
- Account auth + password reset flows

## Architecture

### Web Platform
- Next.js 16 App Router (`app/`)
- Server Actions for bookmark/group/account operations (`app/actions/`)
- Route Handlers for token-auth APIs used by extension (`app/api/`)
- NextAuth credentials auth for web sessions
- TanStack Query for client caching/invalidation

### Data Layer
- PostgreSQL via Prisma (`prisma/schema.prisma`)
- Main entities: `User`, `Bookmark`, `Group`, `ApiToken`, `PasswordResetToken`

### Realtime Model
- SSE endpoint: `GET /api/realtime/bookmarks`
- Web app subscribes and invalidates local query caches on events
- Extension background worker subscribes and rebroadcasts updates to popup

### Extension Client
- Manifest V3 app in `extension/`
- Background worker is source-of-truth for token, cache, network sync
- Popup is a thin UI over runtime messaging

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- Tailwind CSS + shadcn/ui
- Chrome Extension: Vite + CRXJS

## Repository Structure

```text
app/                    Next.js routes, actions, APIs
components/             Web UI components
lib/                    Shared utilities (auth, realtime, metadata, prisma)
prisma/                 Prisma schema and migrations
public/                 Static assets
extension/              Chrome extension project
```

## Getting Started (Web App)

### Prerequisites
- Node.js 20+
- PostgreSQL

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env.local
```

Required:
- `DATABASE_URL`
- `AUTH_SECRET`

Common optional values:
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `OPENAI_API_KEY`
- `ADMIN_EMAIL`

### 3) Run migrations

```bash
npx prisma migrate dev
```

### 4) Start dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Root Scripts

- `npm run dev` - run web app in dev mode
- `npm run build` - build web app for production
- `npm run start` - start production server
- `npm run lint` - lint repository

## APIs Exposed by the App

Web-session/server-action driven UI plus token-auth endpoints for extension/integrations.

Key extension/integration endpoints:
- `GET /api/sync`
- `GET /api/export`
- `GET /api/categories`
- `POST /api/bookmarks`
- `PUT /api/bookmarks`
- `DELETE /api/bookmarks`
- `DELETE /api/bookmarks/:bookmarkId`
- `PUT /api/bookmarks/:bookmarkId/category`
- `GET /api/realtime/bookmarks`

Auth for token APIs:
- `Authorization: Bearer <api-token>`

## Chrome Extension (Integrated Client)

Quick start:

```bash
cd extension
npm install
npm run dev
```

Load unpacked via `chrome://extensions` (Developer mode).

For full extension docs (permissions, messaging contract, cache strategy, release zip), see:
- [extension/README.md](C:/Users/User/Downloads/bookmark/bookmark/extension/README.md)

## Production Build

### Web

```bash
npm run build
```

### Extension

```bash
cd extension
npm run build
```

Zip artifact is generated in `extension/release/`.

## Operational Notes

- API tokens are persisted in extension `chrome.storage.local`.
- Token validity is controlled server-side (revoke/regenerate from web app).
- Realtime and progressive sync keep clients aligned with minimal refresh latency.

## Troubleshooting

### Build fails with `spawn EPERM` (Windows/sandboxed env)
- Usually an execution-environment permission issue rather than app code.
- Retry in a normal local terminal with required permissions.

### PowerShell blocks npm scripts
Use:

```bash
cmd /c npm run build
```

### Extension not updating in realtime
- Verify API base URL and token
- Confirm `/api/realtime/bookmarks` is reachable
- Ensure CORS allows `chrome-extension://` origins

## License

Private.
