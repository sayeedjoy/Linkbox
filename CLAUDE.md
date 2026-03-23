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
| Database | PostgreSQL + Prisma |
| Auth | NextAuth (web sessions), API tokens (extension) |
| AI | Vercel AI SDK + OpenRouter for auto-grouping |
| Email | Resend |
| Extension Build | Vite + CRXJS |

## Common Commands

```bash
# Web app
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # Run ESLint
npx prisma migrate dev  # Run database migrations

# Chrome extension
cd extension && npm run dev    # Dev mode
cd extension && npm run build  # Production build
```

## Architecture

### Directory Structure
```
app/                    Next.js routes, Server Actions, API endpoints
components/             Web UI components (organized by feature)
lib/                    Shared utilities (auth, realtime, metadata, prisma)
prisma/                 Prisma schema and migrations
public/                 Static assets
extension/              Chrome extension (Manifest V3)
```

### Data Layer
- **Prisma schema** (`prisma/schema.prisma`) with custom output to `app/generated/prisma`
- **Models**: `User`, `Bookmark`, `Group`, `ApiToken`, `PasswordResetToken`, `AppConfig`
- User `autoGroupEnabled` flag controls AI categorization; `AppConfig.publicSignupEnabled` gates signup

### API Architecture
- **Route Handlers** (`app/api/`): Session and bearer-token APIs for extension/integrations
- **Server Actions** (`app/actions/`): Bookmark, group, account mutations
- **SSE Endpoint**: `GET /api/realtime/bookmarks` for realtime updates

### Dual Auth System
1. **NextAuth** for web sessions (credentials provider)
2. **API Tokens** (Bearer auth) for extension and integrations - tokens hashed in DB with prefix/suffix for display

### Realtime System
- In-memory pub/sub in `lib/realtime.ts`
- SSE broadcasts events: `bookmark.created/updated/deleted/category.updated`, `group.created/updated/deleted`
- Web app and extension subscribe to keep UI in sync

### Chrome Extension Architecture
- Background worker is source-of-truth for token, cache, progressive sync, and realtime
- Popup and sidepanel are thin UIs over runtime messaging to background
- Manifest V3 with `extension/dist` as build output

## Key Implementation Details

### Prisma Client
- Generated client outputs to `app/generated/prisma` (not default `node_modules`)
- Import from `@/app/generated/prisma/client` in server code
- Use `lib/prisma.ts` singleton for all database access

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
Use `cmd /c npm run build` instead of direct execution.

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
