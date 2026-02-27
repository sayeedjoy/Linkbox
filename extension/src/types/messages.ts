export type MessageType =
  | 'setToken'
  | 'clearToken'
  | 'getToken'
  | 'getBookmarksAndGroups'
  | 'saveBookmark'
  | 'updateBookmark'
  | 'updateBookmarkCategory'
  | 'refreshBookmarks'
  | 'forceLogout'
  | 'deleteBookmark'

export interface SetTokenPayload {
  token: string
}

export interface SaveBookmarkPayload {
  url?: string
  title?: string
  description?: string
  groupId?: string | null
  faviconUrl?: string | null
}

export interface UpdateBookmarkPayload {
  url: string
  title?: string
  description?: string
  groupId?: string | null
  faviconUrl?: string | null
}

export interface UpdateBookmarkCategoryPayload {
  bookmarkId: string
  groupId: string | null
}

export interface DeleteBookmarkPayload {
  bookmarkId: string
  url?: string
}

import type { ExportBookmark, Group } from './data'

export interface GetBookmarksAndGroupsPayload {
  invalidateCache?: boolean
}

export interface GetBookmarksAndGroupsResponse {
  bookmarks: ExportBookmark[]
  groups: Group[]
  unauthorized?: boolean
}

export interface MessagePayloadMap {
  setToken: SetTokenPayload
  clearToken: void
  getToken: void
  getBookmarksAndGroups: GetBookmarksAndGroupsPayload
  saveBookmark: SaveBookmarkPayload
  updateBookmark: UpdateBookmarkPayload
  updateBookmarkCategory: UpdateBookmarkCategoryPayload
  refreshBookmarks: void
  forceLogout: void
  deleteBookmark: DeleteBookmarkPayload
}

export type Message<T extends MessageType = MessageType> = T extends keyof MessagePayloadMap
  ? { type: T; payload?: MessagePayloadMap[T] }
  : never
