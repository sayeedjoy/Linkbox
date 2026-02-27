import type { BookmarkCreatePayload, BookmarkResponse, ExportBookmark, Group } from '../types/data'
import type {
  DeleteBookmarkPayload,
  GetBookmarksAndGroupsPayload,
  GetBookmarksAndGroupsResponse,
  SaveBookmarkPayload,
  SetTokenPayload,
  UpdateBookmarkCategoryPayload,
  UpdateBookmarkPayload,
} from '../types/messages'
import { API_BASE_URL, BOOKMARKS_CACHE_TTL_MS, GROUPS_CACHE_TTL_MS, STORAGE_KEYS } from '../lib/constants'

type FetchListResult<T> = { data: T; unauthorized: boolean }

let bookmarksInFlight: Promise<FetchListResult<ExportBookmark[]>> | null = null
let groupsInFlight: Promise<FetchListResult<Group[]>> | null = null

async function getToken(): Promise<string | null> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.apiToken)
  const token = out[STORAGE_KEYS.apiToken]
  return typeof token === 'string' && token.length > 0 ? token : null
}

async function setStoredToken(token: string | null): Promise<void> {
  if (token === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.apiToken)
    await chrome.storage.local.remove(STORAGE_KEYS.bookmarksCache)
    await chrome.storage.local.remove(STORAGE_KEYS.bookmarksCacheTime)
    await chrome.storage.local.remove(STORAGE_KEYS.groupsCache)
    await chrome.storage.local.remove(STORAGE_KEYS.groupsCacheTime)
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.apiToken]: token })
  }
}

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: true } | { ok: false; status: number }> {
  const token = await getToken()
  if (!token) {
    return { ok: false, status: 401 }
  }
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    await setStoredToken(null)
    return { ok: false, status: 401 }
  }
  if (!res.ok) {
    return { ok: false, status: res.status }
  }
  if (res.status === 204) {
    return { ok: true, data: undefined as T }
  }
  const data = (await res.json()) as T
  return { ok: true, data }
}

async function invalidateBookmarksCache(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.bookmarksCache)
  await chrome.storage.local.remove(STORAGE_KEYS.bookmarksCacheTime)
}

async function invalidateGroupsCache(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.groupsCache)
  await chrome.storage.local.remove(STORAGE_KEYS.groupsCacheTime)
}

function isFresh(time: number | undefined, ttlMs: number): boolean {
  return typeof time === 'number' && Date.now() - time < ttlMs
}

function getArrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

async function fetchBookmarks(): Promise<FetchListResult<ExportBookmark[]>> {
  const result = await fetchWithAuth<ExportBookmark[]>(`/api/export`)
  if (!result.ok) {
    return { data: [], unauthorized: result.status === 401 }
  }
  const rows = Array.isArray(result.data) ? result.data : []
  return {
    data: rows.map((row) => ({
      ...row,
      id: typeof row?.id === 'string' ? row.id : '',
    })) as ExportBookmark[],
    unauthorized: false,
  }
}

async function fetchGroups(): Promise<FetchListResult<Group[]>> {
  const result = await fetchWithAuth<Group[]>(`/api/categories`)
  if (!result.ok) {
    return { data: [], unauthorized: result.status === 401 }
  }
  return { data: Array.isArray(result.data) ? result.data : [], unauthorized: false }
}

async function revalidateBookmarks(): Promise<FetchListResult<ExportBookmark[]>> {
  if (bookmarksInFlight) return bookmarksInFlight
  bookmarksInFlight = (async () => {
    const result = await fetchBookmarks()
    if (!result.unauthorized) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.bookmarksCache]: result.data,
        [STORAGE_KEYS.bookmarksCacheTime]: Date.now(),
      })
    }
    return result
  })()
  try {
    return await bookmarksInFlight
  } finally {
    bookmarksInFlight = null
  }
}

async function revalidateGroups(): Promise<FetchListResult<Group[]>> {
  if (groupsInFlight) return groupsInFlight
  groupsInFlight = (async () => {
    const result = await fetchGroups()
    if (!result.unauthorized) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.groupsCache]: result.data,
        [STORAGE_KEYS.groupsCacheTime]: Date.now(),
      })
    }
    return result
  })()
  try {
    return await groupsInFlight
  } finally {
    groupsInFlight = null
  }
}

async function readCachedData(): Promise<{
  bookmarks: ExportBookmark[]
  groups: Group[]
  hasBookmarks: boolean
  hasGroups: boolean
  bookmarksFresh: boolean
  groupsFresh: boolean
}> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.bookmarksCache,
    STORAGE_KEYS.bookmarksCacheTime,
    STORAGE_KEYS.groupsCache,
    STORAGE_KEYS.groupsCacheTime,
  ])
  const rawBookmarks = stored[STORAGE_KEYS.bookmarksCache]
  const rawGroups = stored[STORAGE_KEYS.groupsCache]
  const bookmarks = getArrayValue<ExportBookmark>(rawBookmarks)
  const groups = getArrayValue<Group>(rawGroups)
  const bookmarksTime = stored[STORAGE_KEYS.bookmarksCacheTime] as number | undefined
  const groupsTime = stored[STORAGE_KEYS.groupsCacheTime] as number | undefined

  return {
    bookmarks,
    groups,
    hasBookmarks: Array.isArray(rawBookmarks),
    hasGroups: Array.isArray(rawGroups),
    bookmarksFresh: isFresh(bookmarksTime, BOOKMARKS_CACHE_TTL_MS),
    groupsFresh: isFresh(groupsTime, GROUPS_CACHE_TTL_MS),
  }
}

async function broadcastBookmarksUpdated(data: GetBookmarksAndGroupsResponse): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.runtime.sendMessage({ type: 'bookmarksUpdated', payload: data }, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

async function revalidateStaleCachesAndBroadcast(staleBookmarks: boolean, staleGroups: boolean): Promise<void> {
  const tasks: Promise<FetchListResult<unknown>>[] = []
  if (staleBookmarks) tasks.push(revalidateBookmarks())
  if (staleGroups) tasks.push(revalidateGroups())
  if (tasks.length === 0) return

  const results = await Promise.all(tasks)
  if (results.some((result) => result.unauthorized)) return

  const fresh = await readCachedData()
  await broadcastBookmarksUpdated({ bookmarks: fresh.bookmarks, groups: fresh.groups })
}

async function getBookmarksAndGroups(invalidateCache = false): Promise<GetBookmarksAndGroupsResponse> {
  const cached = await readCachedData()

  if (invalidateCache || !cached.hasBookmarks || !cached.hasGroups) {
    const [bookmarksResult, groupsResult] = await Promise.all([revalidateBookmarks(), revalidateGroups()])
    if (bookmarksResult.unauthorized || groupsResult.unauthorized) {
      return { bookmarks: [], groups: [], unauthorized: true }
    }
    const fresh = await readCachedData()
    const data = { bookmarks: fresh.bookmarks, groups: fresh.groups }
    await broadcastBookmarksUpdated(data)
    return data
  }

  if (!cached.bookmarksFresh || !cached.groupsFresh) {
    void revalidateStaleCachesAndBroadcast(!cached.bookmarksFresh, !cached.groupsFresh)
  }

  return { bookmarks: cached.bookmarks, groups: cached.groups }
}

async function refreshBookmarksAndGroups(): Promise<GetBookmarksAndGroupsResponse> {
  await invalidateBookmarksCache()
  await invalidateGroupsCache()
  return getBookmarksAndGroups(true)
}

async function refreshBookmarksOnly(): Promise<GetBookmarksAndGroupsResponse> {
  await invalidateBookmarksCache()
  const cached = await readCachedData()
  const bookmarksResult = await revalidateBookmarks()
  if (bookmarksResult.unauthorized) {
    return { bookmarks: [], groups: [], unauthorized: true }
  }

  let groups = cached.groups
  if (!cached.hasGroups) {
    const groupsResult = await revalidateGroups()
    if (groupsResult.unauthorized) {
      return { bookmarks: [], groups: [], unauthorized: true }
    }
    groups = groupsResult.data
  }

  const data = { bookmarks: bookmarksResult.data, groups }
  await broadcastBookmarksUpdated(data)
  return data
}

async function createBookmark(payload: BookmarkCreatePayload): Promise<{ ok: true; data: BookmarkResponse } | { ok: false; status: number; error?: string }> {
  const result = await fetchWithAuth<BookmarkResponse>(`/api/bookmarks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (result.ok) {
    return { ok: true, data: result.data }
  }
  return { ok: false, status: result.status }
}

async function updateBookmark(payload: UpdateBookmarkPayload): Promise<{ ok: true; data: BookmarkResponse } | { ok: false; status: number; error?: string }> {
  const result = await fetchWithAuth<BookmarkResponse>(`/api/bookmarks`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (result.ok) {
    return { ok: true, data: result.data }
  }
  return { ok: false, status: result.status }
}

async function updateBookmarkCategory(payload: UpdateBookmarkCategoryPayload): Promise<{ ok: true; data: BookmarkResponse } | { ok: false; status: number; error?: string }> {
  const result = await fetchWithAuth<BookmarkResponse>(`/api/bookmarks/${encodeURIComponent(payload.bookmarkId)}/category`, {
    method: 'PUT',
    body: JSON.stringify({ groupId: payload.groupId }),
  })
  if (result.ok) {
    return { ok: true, data: result.data }
  }
  return { ok: false, status: result.status }
}

async function deleteBookmarkById(bookmarkId: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const result = await fetchWithAuth<unknown>(`/api/bookmarks/${encodeURIComponent(bookmarkId)}`, {
    method: 'DELETE',
  })
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, status: result.status }
}

async function deleteBookmarkByUrl(url: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const result = await fetchWithAuth<unknown>(`/api/bookmarks`, {
    method: 'DELETE',
    body: JSON.stringify({ url }),
  })
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, status: result.status }
}

function setBadge(text: string, color: string): void {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
}

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    const run = async () => {
      switch (message.type) {
        case 'setToken': {
          const { token } = (message.payload || {}) as SetTokenPayload
          if (typeof token === 'string' && token.trim()) {
            await setStoredToken(token.trim())
            return { success: true }
          }
          return { success: false }
        }
        case 'clearToken': {
          await setStoredToken(null)
          return { success: true }
        }
        case 'getToken': {
          const token = await getToken()
          return { token }
        }
        case 'getBookmarksAndGroups': {
          const token = await getToken()
          if (!token) return { bookmarks: [], groups: [], unauthorized: true }
          const payload = (message.payload || {}) as GetBookmarksAndGroupsPayload
          return getBookmarksAndGroups(payload.invalidateCache ?? false)
        }
        case 'saveBookmark': {
          const payload = (message.payload || {}) as SaveBookmarkPayload
          let url = payload.url
          let title = payload.title
          let faviconUrl = payload.faviconUrl
          if (url === undefined || title === undefined) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (!tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
              return { success: false, error: 'No active tab or unsupported URL' }
            }
            url = tab.url
            title = tab.title || new URL(tab.url).hostname || 'Untitled'
            faviconUrl = tab.favIconUrl && tab.favIconUrl.startsWith('http') ? tab.favIconUrl : undefined
          }
          if (!url || !url.startsWith('http')) {
            return { success: false, error: 'Invalid URL' }
          }
          const createResult = await createBookmark({
            url,
            title: title || undefined,
            description: payload.description,
            groupId: payload.groupId ?? null,
            faviconUrl: faviconUrl ?? null,
          })
          if (createResult.ok) {
            await refreshBookmarksAndGroups()
            setBadge('OK', '#22c55e')
            setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
            return { success: true, data: createResult.data }
          }
          if (createResult.status === 401) {
            return { success: false, unauthorized: true }
          }
          setBadge('!', '#ef4444')
          setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
          return { success: false, status: createResult.status }
        }
        case 'updateBookmark': {
          const payload = (message.payload || {}) as UpdateBookmarkPayload
          if (!payload.url) {
            return { success: false, error: 'Missing URL' }
          }
          const updateResult = await updateBookmark({
            url: payload.url,
            title: payload.title,
            description: payload.description,
            groupId: payload.groupId ?? null,
            faviconUrl: payload.faviconUrl ?? null,
          })
          if (updateResult.ok) {
            const data = await refreshBookmarksAndGroups()
            if (data.unauthorized) return { success: false, unauthorized: true }
            return { success: true, data: updateResult.data }
          }
          if (updateResult.status === 401) {
            return { success: false, unauthorized: true }
          }
          return { success: false, status: updateResult.status, error: updateResult.error }
        }
        case 'updateBookmarkCategory': {
          const payload = (message.payload || {}) as UpdateBookmarkCategoryPayload
          if (!payload.bookmarkId) {
            return { success: false, error: 'Missing bookmarkId' }
          }
          const updateResult = await updateBookmarkCategory({
            bookmarkId: payload.bookmarkId,
            groupId: payload.groupId ?? null,
          })
          if (updateResult.ok) {
            const data = await refreshBookmarksOnly()
            if (data.unauthorized) return { success: false, unauthorized: true }
            return { success: true, data: updateResult.data }
          }
          if (updateResult.status === 401) {
            return { success: false, unauthorized: true }
          }
          return { success: false, status: updateResult.status, error: updateResult.error }
        }
        case 'refreshBookmarks': {
          const token = await getToken()
          if (!token) return { success: false, unauthorized: true }
          const data = await refreshBookmarksOnly()
          if (data.unauthorized) return { success: false, unauthorized: true }
          return { success: true, data }
        }
        case 'forceLogout': {
          await setStoredToken(null)
          return { success: true }
        }
        case 'deleteBookmark': {
          const payload = (message.payload || {}) as DeleteBookmarkPayload
          if (!payload.bookmarkId) return { success: false, error: 'Missing bookmarkId' }
          const bookmarkMatchesPayload = (bookmark: ExportBookmark) =>
            bookmark.id === payload.bookmarkId || (payload.url ? bookmark.url === payload.url : false)

          const deleteByIdResult = await deleteBookmarkById(payload.bookmarkId)
          if (deleteByIdResult.ok) {
            const refreshed = await refreshBookmarksOnly()
            if (refreshed.unauthorized) return { success: false, unauthorized: true }
            return { success: !refreshed.bookmarks.some(bookmarkMatchesPayload), error: refreshed.bookmarks.some(bookmarkMatchesPayload) ? 'Failed to delete bookmark' : undefined }
          }
          if (deleteByIdResult.status === 401) {
            return { success: false, unauthorized: true }
          }

          if (payload.url && [400, 404, 405].includes(deleteByIdResult.status)) {
            const deleteByUrlResult = await deleteBookmarkByUrl(payload.url)
            if (deleteByUrlResult.ok) {
              const refreshed = await refreshBookmarksOnly()
              if (refreshed.unauthorized) return { success: false, unauthorized: true }
              return { success: !refreshed.bookmarks.some(bookmarkMatchesPayload), error: refreshed.bookmarks.some(bookmarkMatchesPayload) ? 'Failed to delete bookmark' : undefined }
            }
            if (deleteByUrlResult.status === 401) {
              return { success: false, unauthorized: true }
            }
            if (deleteByUrlResult.status === 404) {
              const refreshed = await refreshBookmarksOnly()
              if (refreshed.unauthorized) return { success: false, unauthorized: true }
              return { success: !refreshed.bookmarks.some(bookmarkMatchesPayload), error: refreshed.bookmarks.some(bookmarkMatchesPayload) ? 'Failed to delete bookmark' : undefined }
            }
            return { success: false, status: deleteByUrlResult.status, error: 'Failed to delete bookmark' }
          }

          if (deleteByIdResult.status === 404) {
            const refreshed = await refreshBookmarksOnly()
            if (refreshed.unauthorized) return { success: false, unauthorized: true }
            return { success: !refreshed.bookmarks.some(bookmarkMatchesPayload), error: refreshed.bookmarks.some(bookmarkMatchesPayload) ? 'Failed to delete bookmark' : undefined }
          }
          return { success: false, status: deleteByIdResult.status, error: 'Failed to delete bookmark' }
        }
        default:
          return undefined
      }
    }
    run().then(sendResponse)
    return true
  }
)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'linkbox-save-page',
    title: 'Save this page to LinkBox',
    contexts: ['page'],
  })
})

chrome.contextMenus.onClicked.addListener(async (_info, tab) => {
  if (!tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return
  const token = await getToken()
  if (!token) return
  const title = tab.title || new URL(tab.url).hostname || 'Untitled'
  const faviconUrl = tab.favIconUrl && tab.favIconUrl.startsWith('http') ? tab.favIconUrl : undefined
  const result = await createBookmark({
    url: tab.url,
    title,
    groupId: null,
    faviconUrl: faviconUrl ?? null,
  })
  if (result.ok) {
    await refreshBookmarksAndGroups()
    setBadge('OK', '#22c55e')
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
  } else {
    setBadge('!', '#ef4444')
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
  }
})
