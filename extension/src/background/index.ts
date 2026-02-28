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
type FetchAllResult = {
  bookmarks: ExportBookmark[]
  groups: Group[]
  unauthorized: boolean
  syncInProgress?: boolean
}
type SyncApiPayload = {
  bookmarks?: ExportBookmark[]
  groups?: Group[]
  partial?: boolean
  hasMore?: boolean
  nextCursor?: string | null
}
type SyncFetchResult = {
  bookmarks: ExportBookmark[]
  groups: Group[]
  hasMore: boolean
  nextCursor: string | null
  unauthorized: boolean
}

const INITIAL_SYNC_LIMIT = 150
const PROGRESSIVE_SYNC_LIMIT = 300
const REALTIME_RECONNECT_BASE_MS = 1000
const REALTIME_RECONNECT_MAX_MS = 30000
const REALTIME_SUPPRESS_AFTER_LOCAL_MUTATION_MS = 1500

let bookmarksInFlight: Promise<FetchListResult<ExportBookmark[]>> | null = null
let groupsInFlight: Promise<FetchListResult<Group[]>> | null = null
let allInFlight: Promise<FetchAllResult> | null = null
let progressiveSyncInFlight: Promise<void> | null = null
let realtimeAbortController: AbortController | null = null
let realtimeReconnectTimer: ReturnType<typeof setTimeout> | null = null
let realtimeReconnectAttempt = 0
let realtimeLastEventId: string | null = null
let realtimeSuppressedUntil = 0

async function getToken(): Promise<string | null> {
  const out = await chrome.storage.local.get(STORAGE_KEYS.apiToken)
  const token = out[STORAGE_KEYS.apiToken]
  return typeof token === 'string' && token.length > 0 ? token : null
}

async function setStoredToken(token: string | null): Promise<void> {
  if (token === null) {
    await chrome.storage.local.remove(Object.values(STORAGE_KEYS))
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.apiToken]: token })
  }
}

async function clearAuthState(): Promise<void> {
  stopRealtimeSync()
  await setStoredToken(null)
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
    await clearAuthState()
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

async function validateToken(token: string): Promise<boolean> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/api/sync?mode=initial&limit=1`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
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

function normalizeBookmarks(value: unknown): ExportBookmark[] {
  const rows = getArrayValue<ExportBookmark>(value)
  return rows.map((row) => ({
    ...row,
    id: typeof row?.id === 'string' ? row.id : '',
  })) as ExportBookmark[]
}

function toExportBookmark(bookmark: BookmarkResponse): ExportBookmark {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title || '',
    description: bookmark.description ?? null,
    faviconUrl: bookmark.faviconUrl ?? null,
    previewImageUrl: bookmark.previewImageUrl ?? null,
    createdAt: bookmark.createdAt,
    group: bookmark.group?.name ?? '',
    groupColor: bookmark.group?.color ?? null,
  }
}

async function optimisticAddBookmarkToCache(bookmark: BookmarkResponse): Promise<GetBookmarksAndGroupsResponse> {
  const cached = await readCachedData()
  const nextBookmark = toExportBookmark(bookmark)
  const existingIndex = cached.bookmarks.findIndex((item) => item.id === nextBookmark.id)
  const nextBookmarks = [...cached.bookmarks]
  if (existingIndex >= 0) {
    nextBookmarks[existingIndex] = nextBookmark
  } else {
    nextBookmarks.unshift(nextBookmark)
  }

  await setCachedData(nextBookmarks, cached.groups)
  return {
    bookmarks: nextBookmarks,
    groups: cached.groups,
    syncInProgress: false,
  }
}

async function fetchBookmarks(): Promise<FetchListResult<ExportBookmark[]>> {
  const result = await fetchWithAuth<ExportBookmark[]>(`/api/export`)
  if (!result.ok) {
    return { data: [], unauthorized: result.status === 401 }
  }
  return { data: normalizeBookmarks(result.data), unauthorized: false }
}

async function fetchGroups(): Promise<FetchListResult<Group[]>> {
  const result = await fetchWithAuth<Group[]>(`/api/categories`)
  if (!result.ok) {
    return { data: [], unauthorized: result.status === 401 }
  }
  return { data: Array.isArray(result.data) ? result.data : [], unauthorized: false }
}

async function fetchSyncPage(options?: {
  mode?: 'initial' | 'full'
  cursor?: string | null
  limit?: number
}): Promise<SyncFetchResult> {
  const params = new URLSearchParams()
  if (options?.mode) params.set('mode', options.mode)
  if (typeof options?.limit === 'number' && options.limit > 0) params.set('limit', String(options.limit))
  if (options?.cursor) params.set('cursor', options.cursor)
  const query = params.toString()
  const path = query ? `/api/sync?${query}` : '/api/sync'
  const result = await fetchWithAuth<SyncApiPayload>(path)
  if (!result.ok) {
    return { bookmarks: [], groups: [], hasMore: false, nextCursor: null, unauthorized: result.status === 401 }
  }
  return {
    bookmarks: normalizeBookmarks(result.data?.bookmarks),
    groups: getArrayValue<Group>(result.data?.groups),
    hasMore: Boolean(result.data?.hasMore ?? result.data?.partial),
    nextCursor: typeof result.data?.nextCursor === 'string' ? result.data.nextCursor : null,
    unauthorized: false,
  }
}

function bookmarkKey(bookmark: ExportBookmark): string {
  if (bookmark.id?.trim()) return `id:${bookmark.id}`
  return `url:${bookmark.url}|createdAt:${bookmark.createdAt}`
}

function mergeBookmarks(base: ExportBookmark[], incoming: ExportBookmark[]): ExportBookmark[] {
  if (incoming.length === 0) return base
  const seen = new Set(base.map(bookmarkKey))
  const out = [...base]
  for (const bookmark of incoming) {
    const key = bookmarkKey(bookmark)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(bookmark)
  }
  return out
}

async function setCachedData(bookmarks: ExportBookmark[], groups: Group[]): Promise<void> {
  const now = Date.now()
  await chrome.storage.local.set({
    [STORAGE_KEYS.bookmarksCache]: bookmarks,
    [STORAGE_KEYS.bookmarksCacheTime]: now,
    [STORAGE_KEYS.groupsCache]: groups,
    [STORAGE_KEYS.groupsCacheTime]: now,
  })
}

async function hydrateRemainingBookmarksAndBroadcast(
  initialBookmarks: ExportBookmark[],
  groups: Group[],
  cursor: string | null
): Promise<void> {
  if (!cursor) return
  let nextCursor: string | null = cursor
  let merged = initialBookmarks

  while (nextCursor) {
    const result = await fetchSyncPage({
      mode: 'initial',
      cursor: nextCursor,
      limit: PROGRESSIVE_SYNC_LIMIT,
    })
    if (result.unauthorized) return

    merged = mergeBookmarks(merged, result.bookmarks)
    await setCachedData(merged, groups)
    await broadcastBookmarksUpdated({
      bookmarks: merged,
      groups,
      syncInProgress: result.hasMore,
    })
    nextCursor = result.hasMore ? result.nextCursor : null
  }
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

async function revalidateAll(strategy: 'full' | 'initial' = 'full'): Promise<FetchAllResult> {
  if (allInFlight) return allInFlight
  allInFlight = (async () => {
    const result = await fetchSyncPage({
      mode: strategy === 'initial' ? 'initial' : 'full',
      limit: strategy === 'initial' ? INITIAL_SYNC_LIMIT : undefined,
    })
    if (result.unauthorized) {
      return { bookmarks: [], groups: [], unauthorized: true, syncInProgress: false }
    }
    await setCachedData(result.bookmarks, result.groups)
    if (
      strategy === 'initial' &&
      result.hasMore &&
      result.nextCursor &&
      !progressiveSyncInFlight
    ) {
      progressiveSyncInFlight = hydrateRemainingBookmarksAndBroadcast(
        result.bookmarks,
        result.groups,
        result.nextCursor
      ).finally(() => {
        progressiveSyncInFlight = null
      })
    }
    return {
      bookmarks: result.bookmarks,
      groups: result.groups,
      unauthorized: result.unauthorized,
      syncInProgress: strategy === 'initial' ? result.hasMore : false,
    }
  })()
  try {
    return await allInFlight
  } finally {
    allInFlight = null
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

function scheduleRealtimeReconnect(): void {
  if (realtimeReconnectTimer) return
  const backoff = Math.min(
    REALTIME_RECONNECT_MAX_MS,
    REALTIME_RECONNECT_BASE_MS * 2 ** Math.min(realtimeReconnectAttempt, 6)
  )
  const jitter = Math.floor(Math.random() * 300)
  realtimeReconnectTimer = setTimeout(() => {
    realtimeReconnectTimer = null
    void startRealtimeSync()
  }, backoff + jitter)
  realtimeReconnectAttempt += 1
}

function stopRealtimeSync(): void {
  if (realtimeReconnectTimer) {
    clearTimeout(realtimeReconnectTimer)
    realtimeReconnectTimer = null
  }
  if (realtimeAbortController) {
    realtimeAbortController.abort()
    realtimeAbortController = null
  }
  realtimeReconnectAttempt = 0
  realtimeLastEventId = null
  realtimeSuppressedUntil = 0
}

async function handleRealtimeMutationEvent(): Promise<void> {
  if (Date.now() < realtimeSuppressedUntil) return
  const result = await revalidateAll('initial')
  if (result.unauthorized) return
  await broadcastBookmarksUpdated({
    bookmarks: result.bookmarks,
    groups: result.groups,
    syncInProgress: result.syncInProgress,
  })
}

async function startRealtimeSync(): Promise<void> {
  if (realtimeAbortController) return
  const token = await getToken()
  if (!token) return

  const urlBase = API_BASE_URL.replace(/\/$/, '')
  const streamUrl = realtimeLastEventId
    ? `${urlBase}/api/realtime/bookmarks?lastEventId=${encodeURIComponent(realtimeLastEventId)}`
    : `${urlBase}/api/realtime/bookmarks`
  const abortController = new AbortController()
  realtimeAbortController = abortController

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal,
      cache: 'no-store',
    })
    if (!response.ok || !response.body) {
      if (response.status === 401) {
        stopRealtimeSync()
        return
      }
      throw new Error(`Realtime stream failed with status ${response.status}`)
    }

    realtimeReconnectAttempt = 0
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let eventId: string | null = null
    let eventData = ''

    const flushEvent = async () => {
      if (!eventData.trim()) {
        eventId = null
        eventData = ''
        return
      }
      if (eventId) realtimeLastEventId = eventId
      try {
        const parsed = JSON.parse(eventData) as { type?: string; id?: string }
        if (parsed.id && parsed.type && parsed.type.startsWith('bookmark.')) {
          await handleRealtimeMutationEvent()
        }
      } catch {
        // Ignore malformed stream chunks.
      }
      eventId = null
      eventData = ''
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '')
        if (!line) {
          await flushEvent()
          continue
        }
        if (line.startsWith(':')) continue
        if (line.startsWith('id:')) {
          eventId = line.slice(3).trim()
          continue
        }
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim()
          eventData = eventData ? `${eventData}\n${payload}` : payload
        }
      }
    }
  } catch {
    // Reconnect below for transient failures.
  } finally {
    if (realtimeAbortController === abortController) {
      realtimeAbortController = null
      scheduleRealtimeReconnect()
    }
  }
}

async function revalidateStaleCachesAndBroadcast(staleBookmarks: boolean, staleGroups: boolean): Promise<void> {
  if (staleBookmarks && staleGroups) {
    const allResult = await revalidateAll('initial')
    if (allResult.unauthorized) return
    await broadcastBookmarksUpdated({
      bookmarks: allResult.bookmarks,
      groups: allResult.groups,
      syncInProgress: allResult.syncInProgress,
    })
    return
  }

  const tasks: Promise<FetchListResult<unknown>>[] = []
  if (staleBookmarks) tasks.push(revalidateBookmarks())
  if (staleGroups) tasks.push(revalidateGroups())
  if (tasks.length === 0) return

  const results = await Promise.all(tasks)
  if (results.some((result) => result.unauthorized)) return

  const fresh = await readCachedData()
  await broadcastBookmarksUpdated({ bookmarks: fresh.bookmarks, groups: fresh.groups, syncInProgress: false })
}

async function getBookmarksAndGroups(invalidateCache = false): Promise<GetBookmarksAndGroupsResponse> {
  const cached = await readCachedData()

  if (invalidateCache || !cached.hasBookmarks || !cached.hasGroups) {
    const allResult = await revalidateAll('initial')
    if (allResult.unauthorized) {
      return { bookmarks: [], groups: [], unauthorized: true }
    }
    const data = {
      bookmarks: allResult.bookmarks,
      groups: allResult.groups,
      syncInProgress: allResult.syncInProgress,
    }
    await broadcastBookmarksUpdated(data)
    return data
  }

  if (!cached.bookmarksFresh || !cached.groupsFresh) {
    void revalidateStaleCachesAndBroadcast(!cached.bookmarksFresh, !cached.groupsFresh)
  }

  return { bookmarks: cached.bookmarks, groups: cached.groups, syncInProgress: false }
}

async function refreshBookmarksAndGroups(): Promise<GetBookmarksAndGroupsResponse> {
  await invalidateBookmarksCache()
  await invalidateGroupsCache()
  const allResult = await revalidateAll('initial')
  if (allResult.unauthorized) {
    return { bookmarks: [], groups: [], unauthorized: true }
  }
  const data = { bookmarks: allResult.bookmarks, groups: allResult.groups, syncInProgress: allResult.syncInProgress }
  await broadcastBookmarksUpdated(data)
  return data
}

async function refreshBookmarksOnly(): Promise<GetBookmarksAndGroupsResponse> {
  await invalidateBookmarksCache()
  const allResult = await revalidateAll('initial')
  if (allResult.unauthorized) {
    return { bookmarks: [], groups: [], unauthorized: true }
  }
  const data = { bookmarks: allResult.bookmarks, groups: allResult.groups, syncInProgress: allResult.syncInProgress }
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
          const trimmed = typeof token === 'string' ? token.trim() : ''
          if (!trimmed) return { success: false }
          const valid = await validateToken(trimmed)
          if (!valid) return { success: false }
          await setStoredToken(trimmed)
          void revalidateAll('initial')
          void startRealtimeSync()
          return { success: true }
        }
        case 'clearToken': {
          await clearAuthState()
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
            const optimistic = await optimisticAddBookmarkToCache(createResult.data)
            await broadcastBookmarksUpdated(optimistic)
            realtimeSuppressedUntil = Date.now() + REALTIME_SUPPRESS_AFTER_LOCAL_MUTATION_MS
            void revalidateAll('initial').then((allResult) => {
              if (allResult.unauthorized) return
              return broadcastBookmarksUpdated({
                bookmarks: allResult.bookmarks,
                groups: allResult.groups,
                syncInProgress: allResult.syncInProgress,
              })
            })
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
          stopRealtimeSync()
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
    id: 'bookmark-save-page',
    title: 'Save this page to LinkArena',
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
    const optimistic = await optimisticAddBookmarkToCache(result.data)
    await broadcastBookmarksUpdated(optimistic)
    realtimeSuppressedUntil = Date.now() + REALTIME_SUPPRESS_AFTER_LOCAL_MUTATION_MS
    void revalidateAll('initial').then((allResult) => {
      if (allResult.unauthorized) return
      return broadcastBookmarksUpdated({
        bookmarks: allResult.bookmarks,
        groups: allResult.groups,
        syncInProgress: allResult.syncInProgress,
      })
    })
    setBadge('OK', '#22c55e')
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
  } else {
    setBadge('!', '#ef4444')
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000)
  }
})

void getToken().then((token) => {
  if (!token) return
  void startRealtimeSync()
})

chrome.runtime.onStartup.addListener(() => {
  void getToken().then((token) => {
    if (!token) return
    void startRealtimeSync()
  })
})
