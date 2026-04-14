import { startTransition, useState, useEffect, useMemo, useCallback } from 'react'
import { Copy, MoreVertical, Plus, RefreshCw, Search, Tags, Trash2 } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'
import { formatDate } from '@/lib/date'
import { getBookmarksAndGroups, saveBookmark, deleteBookmark, refreshBookmarks, updateBookmarkCategory } from '@/popup/lib/messaging'
import type { ExportBookmark, Group } from '@/types/data'
import type { GetBookmarksAndGroupsResponse } from '@/types/messages'
import ProfileMenu from '@/components/ProfileMenu'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function hostnameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function bookmarkMenuKey(bookmark: ExportBookmark): string {
  if (bookmark.id && bookmark.id.trim()) return bookmark.id
  return `${bookmark.url}-${bookmark.createdAt}`
}

function FaviconImg({ url, faviconUrl }: { url: string; faviconUrl: string | null }) {
  const hostname = hostnameFromUrl(url)
  const googleSrc = hostname
    ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`
    : null
  const storedSrc = faviconUrl?.trim() || null
  const primary = googleSrc ?? storedSrc
  const fallback = storedSrc !== googleSrc ? storedSrc : null
  const [src, setSrc] = useState(primary)

  useEffect(() => {
    setSrc(googleSrc ?? storedSrc)
  }, [url, faviconUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) {
    return <span className="text-muted-foreground text-[10px] font-mono leading-none">{'{}'}</span>
  }

  return (
    <img
      src={src}
      alt=""
      className="w-4 h-4"
      onError={() => {
        if (fallback && src !== fallback) {
          setSrc(fallback)
        } else {
          setSrc(null as unknown as string)
        }
      }}
    />
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-md">
          <div className="shrink-0 w-5 h-5 rounded bg-muted animate-pulse mt-0.5" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function BookmarksView({ onSignOut }: { onSignOut: () => void }) {
  const [bookmarks, setBookmarks] = useState<ExportBookmark[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null)

  const applyData = useCallback((data: GetBookmarksAndGroupsResponse) => {
    startTransition(() => {
      setBookmarks(data.bookmarks)
      setGroups(data.groups)
      setSyncInProgress(Boolean(data.syncInProgress))
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getBookmarksAndGroups()
    if (data.unauthorized) {
      setLoading(false)
      onSignOut()
      return
    }
    applyData(data)
    setLoading(false)
  }, [applyData, onSignOut])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    const listener = (message: { type?: string; payload?: unknown }) => {
      if (message?.type !== 'bookmarksUpdated' || !message.payload) return
      const payload = message.payload as GetBookmarksAndGroupsResponse
      if (!Array.isArray(payload.bookmarks) || !Array.isArray(payload.groups)) return
      applyData(payload)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [applyData])

  const filteredByGroup = useMemo(() => {
    const groupNameToId = new Map(groups.map((group) => [group.name, group.id]))
    if (!selectedGroupId) return bookmarks
    return bookmarks.filter((bookmark) => groupNameToId.get(bookmark.group) === selectedGroupId)
  }, [bookmarks, groups, selectedGroupId])

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return filteredByGroup
    const q = searchQuery.trim().toLowerCase()
    return filteredByGroup.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        hostnameFromUrl(b.url).toLowerCase().includes(q)
    )
  }, [filteredByGroup, searchQuery])

  const handleSaveCurrentTab = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    setSaving(true)
    const result = await saveBookmark({ groupId: selectedGroupId ?? undefined })
    setSaving(false)
    if (result.unauthorized) {
      onSignOut()
      return
    }
    if (result.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } else {
      setSaveError(result.error ?? 'Failed to save')
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    const result = await refreshBookmarks()
    if (result.unauthorized) {
      setRefreshing(false)
      onSignOut()
      return
    }
    if (result.success && result.data) {
      applyData(result.data)
      setRefreshing(false)
      return
    }
    await load()
    setRefreshing(false)
  }, [applyData, load, onSignOut])

  const groupMetaById = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group]))
  }, [groups])

  const syncBookmarksAfterCategoryUpdate = useCallback(async () => {
    const result = await refreshBookmarks()
    if (result.unauthorized) {
      onSignOut()
      return
    }
    if (result.success && result.data) {
      applyData(result.data)
      return
    }
    await load()
  }, [applyData, load, onSignOut])

  const handleEditCategory = async (b: ExportBookmark, groupId: string | null) => {
    if (!b.id || !b.id.trim()) {
      setSaveError('Server response is missing bookmark id. Please update /api/export to include id.')
      return
    }
    setSaveError(null)
    const nextGroup = groupId ? groupMetaById.get(groupId) : null
    const previousGroup = { group: b.group, groupColor: b.groupColor }
    startTransition(() => {
      setBookmarks((current) =>
        current.map((bookmark) =>
          bookmark.id === b.id
            ? {
                ...bookmark,
                group: nextGroup?.name ?? '',
                groupColor: nextGroup?.color ?? null,
              }
            : bookmark
        )
      )
    })

    const result = await updateBookmarkCategory({
      bookmarkId: b.id,
      groupId: groupId ?? null,
    })
    if (result.unauthorized) {
      onSignOut()
      return
    }
    if (!result.success) {
      startTransition(() => {
        setBookmarks((current) =>
          current.map((bookmark) =>
            bookmark.id === b.id
              ? {
                  ...bookmark,
                  group: previousGroup.group,
                  groupColor: previousGroup.groupColor,
                }
              : bookmark
          )
        )
      })
      setSaveError(result.error ?? 'Failed to update category')
      return
    }
    setOpenCategoryMenuId(null)
    setOpenRowMenuId(null)
    void syncBookmarksAfterCategoryUpdate()
  }

  const handleDelete = async (b: ExportBookmark) => {
    if (!b.id || !b.id.trim()) {
      setSaveError('Server response is missing bookmark id. Please update /api/export to include id.')
      return
    }

    setSaveError(null)
    const previousBookmarks = bookmarks
    startTransition(() => {
      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== b.id))
    })

    const result = await deleteBookmark(b.id, b.url)
    if (result.unauthorized) {
      onSignOut()
      return
    }
    if (!result.success) {
      startTransition(() => {
        setBookmarks(previousBookmarks)
      })
      setSaveError(result.error ?? 'Failed to delete bookmark')
      return
    }
    void refreshBookmarks().then((refreshResult) => {
      if (refreshResult.unauthorized) {
        onSignOut()
        return
      }
      if (refreshResult.success && refreshResult.data) {
        applyData(refreshResult.data)
      }
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <header className="shrink-0 px-3 py-2 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md overflow-hidden">
              <img src={LOGO_URL} alt="" className="h-5 w-5 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate text-sm">LinkArena</p>
              <p className="text-xs text-muted-foreground">
                {formatDate()}
                {syncInProgress ? ' • Syncing…' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveCurrentTab} disabled={saving || loading} aria-label="Save current tab">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={loading || refreshing} aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <ProfileMenu onSignOut={onSignOut} />
          </div>
        </div>
      </header>

      <Separator />

      <div className="shrink-0 px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {saveError && <p className="text-xs text-destructive mt-1">{saveError}</p>}
        {saveSuccess && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Bookmark saved!</p>}
      </div>

      <Separator />

      {groups.length > 0 && (
        <>
          <div className="shrink-0 min-w-0 overflow-hidden px-2">
            <div
              className="overflow-x-scroll flex flex-nowrap gap-1.5 items-center py-2 hidden-scrollbar"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY
                  e.preventDefault()
                }
              }}
            >
              <Badge
                variant={selectedGroupId === null ? 'default' : 'secondary'}
                className="shrink-0 cursor-pointer"
                onClick={() => setSelectedGroupId(null)}
              >
                All
                <span className="ml-1 opacity-60 font-normal">{bookmarks.length}</span>
              </Badge>
              {groups.map((g) => (
                <Badge
                  key={g.id}
                  variant={selectedGroupId === g.id ? 'default' : 'secondary'}
                  className="shrink-0 cursor-pointer"
                  style={selectedGroupId === g.id ? { backgroundColor: g.color } : undefined}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  {g.name}
                  {g._count?.bookmarks != null && (
                    <span className="ml-1 opacity-60 font-normal">{g._count.bookmarks}</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      <div className="shrink-0 px-2 pt-2 pb-1">
        <p className="text-xs font-medium text-muted-foreground">
          {searchQuery.trim() ? `Results for "${searchQuery.trim()}"` : 'All Bookmarks'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hidden-scrollbar">
        <div className="px-2 pb-2">
          {loading ? (
            <SkeletonRows />
          ) : filteredBookmarks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground px-4">
              {searchQuery.trim()
                ? `No results for "${searchQuery.trim()}"`
                : bookmarks.length === 0
                  ? 'No bookmarks yet. Click + to save the current tab.'
                  : 'No bookmarks in this group.'}
            </div>
          ) : (
            <ul className="space-y-0">
              {filteredBookmarks.map((b) => (
                <li key={bookmarkMenuKey(b)} className="group">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="shrink-0 w-5 h-5 flex items-center justify-center overflow-hidden rounded mt-0.5">
                      <FaviconImg url={b.url} faviconUrl={b.faviconUrl} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate block">{b.title || hostnameFromUrl(b.url) || b.url}</p>
                      <p className="text-xs text-muted-foreground">{hostnameFromUrl(b.url)}</p>
                      {b.group && (
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0" style={{ backgroundColor: (b.groupColor || '#6b7280') + '30', color: b.groupColor || undefined }}>
                          {b.group}
                        </Badge>
                      )}
                    </div>
                    <div onClick={(e) => e.preventDefault()} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
                      <DropdownMenu
                        open={openRowMenuId === bookmarkMenuKey(b)}
                        onOpenChange={(open) => {
                          setOpenRowMenuId(open ? bookmarkMenuKey(b) : null)
                          if (!open) setOpenCategoryMenuId(null)
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                            aria-label="Row menu"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigator.clipboard.writeText(b.url); }}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy link
                          </DropdownMenuItem>
                          {groups.length > 0 && (
                            <DropdownMenuSub
                              open={openCategoryMenuId === bookmarkMenuKey(b)}
                              onOpenChange={(open) => setOpenCategoryMenuId(open ? bookmarkMenuKey(b) : null)}
                            >
                              <DropdownMenuSubTrigger>
                                <Tags className="mr-2 h-4 w-4" />
                                Edit category
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleEditCategory(b, null); }}>
                                  No group
                                </DropdownMenuItem>
                                {groups.map((g) => (
                                  <DropdownMenuItem key={g.id} onSelect={(e) => { e.preventDefault(); handleEditCategory(b, g.id); }}>
                                    {g.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuItem
                            onSelect={(e) => { e.preventDefault(); handleDelete(b); }}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
