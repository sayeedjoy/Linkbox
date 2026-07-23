# Changelog

## [Unreleased]

### Fixed
- **Content-script CSS leaking onto every site** — Removed the orphaned content script that matched `https://*/*`. It rendered nothing (its React root returned `null`) but still injected an empty `#crxjs-app` div and a leftover stylesheet with unscoped utility classes (`.opacity-0`, `.opacity-100`, `.popup-container`, …) into every page. On sites that use the same class names — e.g. ChatGPT, which hides its per-message action buttons with Tailwind's `opacity-0` — the injected rules collided and hid UI such as the message edit icon. The extension no longer injects any script or CSS into web pages.

### Changed
- **Quota model** — Daily limit is now counted per bookmark written, not per API call. Realtime browser sync and one-click bulk import both consume from the same `bookmarkQuotaPerDay` budget.
- **Plan flags split** — The single `browserImportAllowed` flag has been replaced by two independent admin-toggleable flags: `browserRealtimeSyncAllowed` (live `chrome.bookmarks.onCreated` sync) and `browserBulkImportAllowed` (one-click import of existing bookmarks).
- **403 on realtime sync** — When the server returns 403 for `source: "browser_realtime"`, the extension flips an in-memory flag and stops firing `chrome.bookmarks.onCreated` requests until the service worker restarts. Avoids spamming the server with rejected requests when an admin disables the entitlement.

## [1.6.0] - 2026-05-15

### Added
- **Browser bookmark import** — The extension can now read native Chrome bookmarks (`bookmarks` permission) and bulk-upload them to LinkArena. Import is triggered from the web app's settings modal via `chrome.runtime.sendMessage` and runs in chunks up to 2,000 items per batch, with duplicates deduped per group and everything routed into an auto-created "Imported - Browser" group.
- **Realtime browser bookmark sync** — New bookmarks created in Chrome are picked up via `chrome.bookmarks.onCreated` and pushed to LinkArena in real time, tagged with `source: "browser_realtime"`. A `bulkImportInProgress` flag suppresses this listener during bulk imports so the same items aren't sent twice.
- **Web ↔ extension bridge** — Added `externally_connectable.matches` for `localhost:3000`, `linkarena.app`, and `*.linkarena.app` so the web app can detect the installed extension and invoke import/ping commands. Allowed origins are configurable at build time via `VITE_ALLOWED_WEB_ORIGINS`.

### Notes
- Browser bookmark import is gated server-side by the Pro plan's `browserImportAllowed` entitlement; free-tier users will see the API reject the request.

## [1.5.0] - 2026-04-14

### Fixed
- **macOS token persistence** — Extension no longer logs out after closing the browser or shutting down on macOS. Previously any 401 response immediately wiped the stored API token. Now the extension requires 3 consecutive 401s and confirms with a token validation check before clearing credentials, preventing transient network failures on startup from destroying the session.
- **Startup race condition** — Added a 2-second delay before initiating realtime sync on service worker startup and browser launch, giving macOS time to re-establish network connectivity before making authenticated requests.

### Added
- **Favicon fallback** — Bookmark favicons now use Google's favicon API as the primary source, with the stored favicon as a fallback. This ensures favicons display correctly regardless of light/dark theme and recovers gracefully when a stored favicon URL is broken.
- **Save success feedback** — A "Bookmark saved!" confirmation message now appears briefly after saving the current tab.
- **Group bookmark counts** — Group filter badges now show the number of bookmarks in each group (e.g. "Work 12"). The "All" badge shows the total count.
- **Functional side panel** — The side panel now shows the full bookmark interface (search, groups, list) instead of just the logo placeholder.
- **Skeleton loading** — The bookmark list shows animated placeholder rows while loading instead of a plain "Loading..." text.
- **Contextual empty states** — Empty state messages are now context-aware: distinguishes between no bookmarks at all ("No bookmarks yet. Click + to save the current tab."), no search results ("No results for "query""), and no bookmarks in the selected group.
