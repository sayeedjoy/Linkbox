import type {
  GetBookmarksAndGroupsPayload,
  GetBookmarksAndGroupsResponse,
  Message,
  MessageType,
  SaveBookmarkPayload,
  UpdateBookmarkCategoryPayload,
  UpdateBookmarkPayload,
} from '@/types/messages'

export function sendMessage<T extends MessageType>(
  type: T,
  payload?: Message<T>['payload']
): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message })
      } else {
        resolve(response)
      }
    })
  })
}

export async function setToken(token: string): Promise<{ success: boolean }> {
  const res = await sendMessage('setToken', { token })
  return (res as { success: boolean }) ?? { success: false }
}

export async function clearToken(): Promise<{ success: boolean }> {
  const res = await sendMessage('clearToken')
  return (res as { success: boolean }) ?? { success: false }
}

export async function getToken(): Promise<string | null> {
  const res = await sendMessage('getToken')
  const out = res as { token: string | null }
  return out?.token ?? null
}

export async function getBookmarksAndGroups(invalidateCache = false): Promise<GetBookmarksAndGroupsResponse> {
  const res = await sendMessage('getBookmarksAndGroups', { invalidateCache } as GetBookmarksAndGroupsPayload)
  const out = res as GetBookmarksAndGroupsResponse
  if (out && Array.isArray(out.bookmarks) && Array.isArray(out.groups)) return out
  return { bookmarks: [], groups: [] }
}

export async function saveBookmark(payload?: SaveBookmarkPayload): Promise<{
  success: boolean
  unauthorized?: boolean
  error?: string
  status?: number
}> {
  const res = await sendMessage('saveBookmark', payload ?? {})
  return (res as { success: boolean; unauthorized?: boolean; error?: string; status?: number }) ?? { success: false }
}

export async function updateBookmark(payload: UpdateBookmarkPayload): Promise<{
  success: boolean
  unauthorized?: boolean
  error?: string
  status?: number
}> {
  const res = await sendMessage('updateBookmark', payload)
  return (res as { success: boolean; unauthorized?: boolean; error?: string; status?: number }) ?? { success: false }
}

export async function updateBookmarkCategory(payload: UpdateBookmarkCategoryPayload): Promise<{
  success: boolean
  unauthorized?: boolean
  error?: string
  status?: number
}> {
  const res = await sendMessage('updateBookmarkCategory', payload)
  return (res as { success: boolean; unauthorized?: boolean; error?: string; status?: number }) ?? { success: false }
}

export async function refreshBookmarks(): Promise<{ success: boolean; unauthorized?: boolean; data?: GetBookmarksAndGroupsResponse }> {
  const res = await sendMessage('refreshBookmarks')
  return (res as { success: boolean; unauthorized?: boolean; data?: GetBookmarksAndGroupsResponse }) ?? { success: false }
}

export async function deleteBookmark(bookmarkId: string, url?: string): Promise<{ success: boolean; error?: string; status?: number; unauthorized?: boolean }> {
  const res = await sendMessage('deleteBookmark', { bookmarkId, url })
  const out = res as { success: boolean; error?: string; status?: number; unauthorized?: boolean }
  return out ?? { success: false, error: 'Unknown error' }
}
