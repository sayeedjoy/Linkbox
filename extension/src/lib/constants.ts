export const STORAGE_KEYS = {
  apiToken: 'linkbox_apiToken',
  bookmarksCache: 'linkbox_bookmarksCache',
  bookmarksCacheTime: 'linkbox_bookmarksCacheTime',
  groupsCache: 'linkbox_groupsCache',
  groupsCacheTime: 'linkbox_groupsCacheTime',
  theme: 'linkbox_theme',
} as const

export const BOOKMARKS_CACHE_TTL_MS = 5 * 60 * 1000
export const GROUPS_CACHE_TTL_MS = 30 * 60 * 1000

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_LINKBOX_API_URL?: string } }).env?.VITE_LINKBOX_API_URL) ||
  'http://localhost:3000/'

export const WEB_APP_URL = API_BASE_URL
