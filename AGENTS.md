# AGENTS.md

Operating guide for coding agents working in this repository.

## Mission

- Project: LinkArena
- This repository contains two related apps:
- A Next.js web app at the repo root
- A Chrome extension workspace in `extension/`
- The product manages bookmarks, groups, export, token-auth extension access, and realtime sync

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL with Prisma
- NextAuth credentials auth for browser web sessions
- Token-auth route handlers for extension and integration APIs
- Tailwind CSS with shadcn/ui-style components
- Chrome extension built with React, Vite, and CRXJS

## Repo Map

- `app/`: Next.js routes, pages, server actions, and route handlers
- `components/`: shared web UI components
- `hooks/`: reusable React hooks
- `lib/`: auth, Prisma, metadata, realtime, and shared utilities
- `prisma/`: schema and migrations
- `public/`: static assets for the web app
- `extension/`: separate Chrome extension workspace

High-value files:

- `README.md`: root product and architecture overview
- `extension/README.md`: extension-specific architecture and runtime behavior
- `package.json`: root scripts and dependencies
- `extension/package.json`: extension scripts and dependencies
- `prisma/schema.prisma`: data model source of truth
- `next.config.ts`: Next.js runtime and bundling configuration
- `eslint.config.mjs`: lint configuration
- `extension/manifest.config.ts`: extension manifest definition
- `extension/src/types/messages.ts`: popup/background runtime message contract
- `extension/src/lib/constants.ts`: extension storage keys and API base URL
- `lib/api-auth.ts`: bearer-token auth helpers

## Working Rules

- Read `README.md` and `extension/README.md` before making structural changes.
- Keep root web-app changes and `extension/` changes separated unless the feature clearly spans both.
- Make the smallest coherent change that solves the issue.
- Preserve the existing TypeScript style and `@/` import alias usage where already used.
- Do not add dependencies unless the current toolset cannot reasonably solve the problem.
- Treat auth, token handling, and storage clearing as security-sensitive areas.
- If changing token-auth routes, evaluate both browser-session behavior and extension bearer-token behavior.
- If changing extension storage clearing, preserve non-auth preferences such as theme unless the UX explicitly changes.
- Do not log plaintext tokens, secrets, or credential-like values.

## Web App Guidance

- The web app lives at the repository root, not in `extension/`.
- App Router files live under `app/`.
- Prefer existing patterns in `app/actions/` for app-triggered mutations.
- Use `app/api/` route handlers for extension and integration-facing APIs.
- Browser auth uses NextAuth credentials sessions.
- Prisma-backed data logic should follow the current schema in `prisma/schema.prisma`.
- If changing schema, account for migration workflow and downstream Prisma client impact.
- Respect `next.config.ts`, especially `output: "standalone"` and `serverExternalPackages`.

## Extension Guidance

- `extension/` is an independent workspace with its own `package.json`.
- The background service worker is the source of truth for token state, cache, sync, realtime, and messaging.
- Keep the popup thin. Prefer runtime messaging over direct API orchestration in popup components.
- Extension auth is token-based, not cookie/session-based.
- Token and cache state live in `chrome.storage.local`.
- If popup auth UX changes, update the background message contract and popup consumers together.
- If extension API behavior changes, verify Bearer auth expectations and CORS handling for `chrome-extension://` origins.

## Data And Auth

- Core Prisma models include `User`, `Bookmark`, `Group`, `ApiToken`, and `PasswordResetToken`.
- API tokens are hashed server-side before lookup.
- Browser web-session auth and extension bearer auth are distinct mechanisms.
- If a route supports both session and bearer auth, be explicit about fallback behavior.
- Extension logout should clear auth-derived storage immediately.
- Realtime bookmark sync depends on authenticated route access and correct extension origin handling.

## Commands

Root app:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npx prisma migrate dev`

Extension:

- `cd extension && npm install`
- `cd extension && npm run dev`
- `cd extension && npm run build`

Windows note:

- If PowerShell blocks npm scripts, use `cmd /c npm run <script>`.

## Validation And Verification

- Run the smallest relevant validation for the area you changed.
- For web route or data changes, prefer lint, build, or focused manual API verification.
- For extension changes, rebuild the extension and test popup flows manually.
- For auth changes, verify valid token, invalid token, logout, and cache-clearing behavior.
- If validation is blocked by environment restrictions, report the exact command and failure instead of guessing.

## Environment And Secrets

Root environment values documented in the repo:

- `DATABASE_URL`
- `AUTH_SECRET`
- Optional: `NEXTAUTH_URL`
- Optional: `NEXT_PUBLIC_APP_URL`
- Optional: `RESEND_API_KEY`
- Optional: `RESEND_FROM_EMAIL`
- Optional: `OPENAI_API_KEY`
- Optional: `ADMIN_EMAIL`

Extension environment:

- `VITE_BOOKMARK_API_URL`

Rules:

- Never commit real secrets.
- Prefer local configuration via `.env.local` and local extension env setup.

## Known Pitfalls

- The root app and `extension/` are separate workspaces. Run commands in the correct directory.
- Windows or sandboxed environments may fail on `npm run build` or `npm run lint` with `EPERM`.
- Extension auth bugs often involve both background storage behavior and server route auth fallback.
- Popup error messages can hide server or network failures if message contracts are too coarse.
- Route-handler auth changes must be checked against extension CORS and origin behavior.
- Extension issues are often owned by the background worker rather than the popup UI.

## Change Checklist

- Confirm you changed the correct workspace.
- Update shared types if a runtime message contract changed.
- Verify auth and storage effects if touching extension auth or logout behavior.
- Consider Prisma schema and migration impact if touching the data layer.
- Record any environment-caused validation failures in the final handoff.
