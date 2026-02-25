"use client";

import { GroupDropdown } from "@/components/group-dropdown";
import { UserMenu } from "@/components/user-menu";
import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { BookmarkList } from "@/components/bookmark-list";
import { PreviewDialog } from "./preview-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { useBookmarkApp } from "./use-bookmark-app";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";

export function BookmarkApp({
  initialBookmarks,
  initialGroups,
  initialSelectedGroupId,
  initialTotalBookmarkCount,
}: {
  initialBookmarks: BookmarkWithGroup[];
  initialGroups: GroupWithCount[];
  initialSelectedGroupId?: string | null;
  initialTotalBookmarkCount?: number;
}) {
  const {
    groups,
    totalBookmarkCount,
    selectedGroupId,
    handleSelectGroupId,
    refreshGroups,
    searchMode,
    searchQuery,
    inputValue,
    setInputValue,
    setSearchQuery,
    displayedBookmarks,
    sortKey,
    sortOrder,
    setSortKey,
    setSortOrder,
    handleHeroSubmit,
    handleHeroPaste,
    handleBookmarksChange,
    previewBookmark,
    setPreviewBookmark,
    showShortcuts,
    setShowShortcuts,
    isSubmitting,
    focusedIndex,
    setFocusedIndex,
    setBookmarks,
  } = useBookmarkApp({ initialBookmarks, initialGroups, initialSelectedGroupId, initialTotalBookmarkCount });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header>
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 max-w-4xl w-full mx-auto">
          <GroupDropdown
            groups={groups}
            totalBookmarkCount={totalBookmarkCount}
            selectedGroupId={selectedGroupId}
            onSelectGroupId={handleSelectGroupId}
            onGroupsChange={refreshGroups}
          />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-6">
        <BookmarkHeroInput
          value={searchMode ? searchQuery : inputValue}
          onChange={searchMode ? setSearchQuery : setInputValue}
          onSubmit={handleHeroSubmit}
          onPaste={handleHeroPaste}
          searchMode={searchMode}
          disabled={isSubmitting}
        />
        <BookmarkList
          bookmarks={displayedBookmarks}
          groups={groups}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
          onBookmarksChange={handleBookmarksChange}
          onGroupsChange={refreshGroups}
          onBookmarkUpdate={(id, patch) => {
            const upd = (b: BookmarkWithGroup) =>
              b.id === id
                ? {
                    ...b,
                    ...patch,
                    group: patch.groupId
                      ? groups.find((g) => g.id === patch.groupId!) ?? null
                      : null,
                  }
                : b;
            setBookmarks((prev) => prev.map(upd));
          }}
          focusedIndex={focusedIndex}
          onFocusChange={setFocusedIndex}
        />
      </main>
      <PreviewDialog
        bookmark={previewBookmark}
        open={!!previewBookmark}
        onOpenChange={(o) => !o && setPreviewBookmark(null)}
      />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
