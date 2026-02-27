export interface ExportBookmark {
  id: string
  url: string
  title: string
  description: string | null
  faviconUrl: string | null
  previewImageUrl: string | null
  createdAt: string
  group: string
  groupColor: string | null
}

export interface Group {
  id: string
  name: string
  color: string
  order: number
  _count?: { bookmarks: number }
}

export interface BookmarkCreatePayload {
  url: string
  title?: string
  description?: string
  groupId?: string | null
  faviconUrl?: string | null
}

export interface BookmarkResponse {
  id: string
  userId: string
  groupId: string | null
  url: string
  title: string
  description: string | null
  faviconUrl: string | null
  previewImageUrl: string | null
  createdAt: string
  updatedAt: string
  group?: { id: string; name: string; color: string } | null
}
