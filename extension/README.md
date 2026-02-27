# LinkBox Chrome Extension

Production-ready Chrome Extension (Manifest V3) for saving, browsing, editing, and syncing bookmarks from your LinkBox account.

This extension uses:
- React + TypeScript + Vite
- CRXJS (`@crxjs/vite-plugin`) for extension builds
- Background service worker for API/auth/cache/realtime orchestration
- Popup UI as the primary user interface

## Features

- Save current tab to LinkBox from popup or context menu
- Browse/search/filter bookmarks by group
- Edit bookmark category
- Delete bookmarks
- Manual refresh with progressive sync for fast first paint
- Realtime updates across devices via server stream + background rebroadcast
- Theme persistence in local extension storage

## Security and Token Model

- API token is stored in `chrome.storage.local` under `bookmark_apiToken`.
- Token never leaves the browser except in `Authorization: Bearer <token>` headers to your API base URL.
- Token is not automatically deleted on API `401`; user controls removal via sign-out/clear token.
- Token remains valid until revoked/regenerated server-side.

## Architecture

### 1) Popup UI (`src/popup/*`, `src/components/*`)

- `TokenSignIn`: accepts API token and sends `setToken` message.
- `BookmarksView`: renders bookmarks/groups and sends actions to background worker.
- Uses runtime messaging (`chrome.runtime.sendMessage`) through `src/popup/lib/messaging.ts`.

### 2) Background Service Worker (`src/background/index.ts`)

Central coordinator for:
- Token read/write
- API calls
- Local cache + TTL
- Realtime stream subscription + reconnect
- Optimistic update and broadcast to popup
- Context menu integration

### 3) Storage (`chrome.storage.local`)

Keys from `src/lib/constants.ts`:
- `bookmark_apiToken`
- `bookmark_bookmarksCache`
- `bookmark_bookmarksCacheTime`
- `bookmark_groupsCache`
- `bookmark_groupsCacheTime`
- `bookmark_theme`

TTL defaults:
- Bookmarks: 5 minutes
- Groups: 30 minutes

### 4) Realtime Sync

Background worker opens authenticated stream to:
- `GET /api/realtime/bookmarks`

Behavior:
- Auto-starts when token exists
- Reconnects with exponential backoff + jitter
- Uses `lastEventId` resume cursor
- On incoming bookmark events, triggers fast revalidation and rebroadcast

## Server API Contract Used by Extension

Base URL: `VITE_BOOKMARK_API_URL` (fallback: `http://localhost:3000/`)

Endpoints used:
- `GET /api/sync` (initial/full progressive sync)
- `GET /api/export` (bookmarks list fallback)
- `GET /api/categories` (groups list fallback)
- `POST /api/bookmarks` (create bookmark)
- `PUT /api/bookmarks` (update bookmark)
- `DELETE /api/bookmarks` (delete by URL fallback)
- `DELETE /api/bookmarks/:bookmarkId` (delete by id)
- `PUT /api/bookmarks/:bookmarkId/category` (move category)
- `GET /api/realtime/bookmarks` (realtime stream)

Expected auth header:
- `Authorization: Bearer <api-token>`

## Runtime Message API (Popup -> Background)

Defined in `src/types/messages.ts`:
- `setToken`
- `clearToken`
- `getToken`
- `getBookmarksAndGroups`
- `saveBookmark`
- `updateBookmark`
- `updateBookmarkCategory`
- `refreshBookmarks`
- `forceLogout`
- `deleteBookmark`

## Caching and Sync Strategy

- Cold load: `getBookmarksAndGroups` serves cache if available, then stale-while-revalidate.
- Initial/faster sync: uses `/api/sync?mode=initial` with pagination.
- Progressive hydration: fetches remaining pages in background and rebroadcasts updates.
- Manual refresh: invalidates cache and re-fetches with initial progressive strategy.
- Save action: optimistic insert in cache, immediate UI broadcast, then background reconcile.

## Project Structure

- `manifest.config.ts`: extension manifest definition
- `vite.config.ts`: build + CRX plugin + zip release output
- `src/background/index.ts`: service worker logic
- `src/popup/*`: popup app entry
- `src/components/*`: popup components
- `src/content/*`: content script
- `src/sidepanel/*`: side panel UI
- `src/types/*`: shared message/data types
- `public/icons/*`: extension icons

## Permissions (Manifest V3)

Configured in `manifest.config.ts`:
- `activeTab`: read active tab details for quick save
- `contextMenus`: add page-save action from the browser context menu
- `tabs`: query active tab metadata
- `storage`: persist token/cache/theme
- `sidePanel`: side panel entry
- `contentSettings`: extension content settings access

## Development

From `extension/`:

```bash
npm install
npm run dev
```

Load unpacked extension:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked from the generated dev output directory (from Vite/CRX)

## Production Build

```bash
npm run build
```

Outputs:
- Build artifacts under `dist/`
- Zip artifact under `release/` named:
  - `bookmark-extension-<version>.zip`

## Environment Variables

Set in extension environment (for Vite):

- `VITE_BOOKMARK_API_URL`

Example:

```bash
VITE_BOOKMARK_API_URL=https://your-linkbox-app.com/
```

If missing, defaults to `http://localhost:3000/`.

## Troubleshooting

### Unauthorized in popup
- Ensure token is valid and not revoked server-side.
- Re-paste token in sign-in screen.

### Data looks stale
- Click refresh in popup.
- Verify backend `/api/sync` and `/api/realtime/bookmarks` are reachable.

### Realtime not updating
- Confirm backend stream supports Bearer auth.
- Check CORS for `chrome-extension://` origins on stream and bookmark endpoints.

### Build issues
- If `npm` PowerShell policy blocks execution on Windows, run via `cmd /c npm ...`.
- If fonts/network fail in web app root build, that is separate from extension build.

## Notes

- This extension intentionally keeps account session logic out of Chrome cookies; auth is token-based.
- Background worker is the source of truth for network and cache behavior; popup is a thin client.
- Branding note: the current extension manifest display name is still `Bookmark`; rename `name` in `manifest.config.ts` if you want the Chrome UI label to show `LinkBox`.
