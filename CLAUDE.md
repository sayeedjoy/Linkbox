# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinkArena is a full-stack bookmarking platform with two clients:
- **Web app** (Next.js 16) for bookmark management, organization, settings, and account flows
- **Chrome extension** (Manifest V3) for fast capture and lightweight browsing with token-auth sync

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui-style components |
| Language | TypeScript 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | NextAuth (web sessions), API tokens (extension) |
| AI | Vercel AI SDK + OpenRouter for auto-grouping |
| Email | Resend |
| Extension Build | Vite + CRXJS |

## Common Commands

```bash
# Web app
pnpm dev           # Start development server
pnpm build         # Production build
pnpm start         # Start production server
pnpm lint          # Run ESLint

# Database (Drizzle)
pnpm db:generate   # Generate SQL migration files from schema changes
pnpm db:migrate    # Apply pending migrations to the database
pnpm db:push       # Push schema directly (no migration files, for dev)
pnpm db:studio     # Open Drizzle Studio UI

# Chrome extension
cd extension && npm run dev    # Dev mode
cd extension && npm run build  # Production build (tsc -b && vite build)
```

There is no test framework configured in this project.

## Architecture

### Directory Structure
```
app/                    Next.js routes, Server Actions, API endpoints
components/             Web UI components (organized by feature)
db/                     Drizzle schema (db/schema.ts)
drizzle/                Generated SQL migrations
lib/                    Shared utilities (auth, realtime, metadata, db)
public/                 Static assets
extension/              Chrome extension (Manifest V3)
```

### Data Layer
- **Schema** (`db/schema.ts`) defines all tables using Drizzle's `pgTable` builder
- **DB singleton** (`lib/db.ts`) — import `db` from here for all database access; also re-exports all schema tables
- **Models**: `users`, `bookmarks`, `groups`, `apiTokens`, `passwordResetTokens`, `appConfig`
- User `autoGroupEnabled` flag controls AI categorization; `appConfig.publicSignupEnabled` gates signup
- Migration files live in `drizzle/` and are applied with `pnpm db:migrate`

### API Architecture
- **Route Handlers** (`app/api/`): Session and bearer-token APIs for extension/integrations
- **Server Actions** (`app/actions/`): Bookmark, group, account mutations
- **SSE Endpoint**: `GET /api/realtime/bookmarks` for realtime updates
- **Mobile API** (`app/api/mobile/auth/`): Separate REST endpoints for mobile clients — login, logout, signup, forgot-password, reset-password

### Dual Auth System
1. **NextAuth** for web sessions (credentials provider)
2. **API Tokens** (Bearer auth) for extension and integrations — tokens hashed in DB with prefix/suffix for display

### Realtime System
- In-memory pub/sub in `lib/realtime.ts`
- SSE broadcasts events: `bookmark.created/updated/deleted/category.updated`, `group.created/updated/deleted`
- Web app and extension subscribe to keep UI in sync

### Chrome Extension Architecture
- Background worker is source-of-truth for token, cache, progressive sync, and realtime
- Popup and sidepanel are thin UIs over runtime messaging to background
- Manifest V3 with `extension/dist` as build output

## Key Implementation Details

### Database Access
- Import `{ db }` from `lib/db.ts` for all queries — never instantiate Drizzle directly
- The `db` export is a lazy Proxy so the pool isn't created until first use (safe for Next.js hot-reload)
- `lib/db.ts` also re-exports every table from `db/schema.ts`, so you can do `import { db, users, bookmarks } from "@/lib/db"`
- Use Drizzle's relational query API (`db.query.users.findMany(...)`) for joins; it requires the relations defined at the bottom of `db/schema.ts`

### Route Protection
- `proxy.ts` (root) is the Next.js middleware — protects `/dashboard/:path*` and `/admin/:path*`, redirecting unauthenticated users to `/sign-in` with a callback URL

### Auth Flow
- `lib/auth.ts` exports `getVerifiedAuthSession()` and `currentUserId()` helpers
- All Server Actions use `currentUserId()` which throws `"Unauthorized"` if no session
- API routes check both session (via `getVerifiedAuthSession()`) and Bearer token (via `lib/api-auth.ts`)

### AI Auto-Grouping
- Triggered via `app/actions/categorize.ts` Server Action
- Uses Vercel AI SDK with OpenRouter provider
- Only runs when user has `autoGroupEnabled: true`

### URL Metadata Unfurling
- `lib/metadata.ts` handles fetching/parsing link metadata (title, description, favicon, preview image)
- Used when bookmarks are created to enrich them with preview data

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret

**Optional:**
- `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` - App URLs
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - Email
- `OPENROUTER_API_KEY` - AI categorization
- `ADMIN_EMAIL` - Admin access

## Troubleshooting

### Build fails with `spawn EPERM` on Windows
Use `cmd /c pnpm build` instead of direct execution.

### Extension realtime not working
Verify API base URL, token validity, and CORS allows `chrome-extension://` origins.

## UI Component Organization

Components are grouped by feature:
- `components/bookmark-app/` - Main bookmark management interface
- `components/bookmark-list/` - Bookmark list/grid views
- `components/group-dropdown/` - Group management (create, delete, reorder)
- `components/timeline/` - Timeline view component
- `components/ui/` - Base UI components (shadcn-style)
- `components/admin/` - Admin-specific components
- `components/auth/` - Sign in/up forms
