export const STORAGE_KEYS = {
  apiToken: 'bookmark_apiToken',
  bookmarksCache: 'bookmark_bookmarksCache',
  bookmarksCacheTime: 'bookmark_bookmarksCacheTime',
  groupsCache: 'bookmark_groupsCache',
  groupsCacheTime: 'bookmark_groupsCacheTime',
  theme: 'bookmark_theme',
} as const

export const BOOKMARKS_CACHE_TTL_MS = 5 * 60 * 1000
export const GROUPS_CACHE_TTL_MS = 30 * 60 * 1000

export const BROWSER_IMPORT_LIMIT = 2000

export const ALLOWED_WEB_ORIGINS: readonly string[] = (() => {
  const fromEnv =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_ALLOWED_WEB_ORIGINS?: string } }).env
      ?.VITE_ALLOWED_WEB_ORIGINS
  const list = fromEnv
    ? fromEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000', 'https://linkarena.app']
  return list
})()

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_BOOKMARK_API_URL?: string; DEV?: boolean } }).env?.VITE_BOOKMARK_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
    ? 'http://localhost:3000/'
    : 'https://linkarena.app/')

export const WEB_APP_URL = API_BASE_URL

export const LOGO_URL =
  typeof chrome !== 'undefined' && chrome.runtime
    ? chrome.runtime.getURL('public/icons/bookmark-48.png')
    : ''
