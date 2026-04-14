# Changelog

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
