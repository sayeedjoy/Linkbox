"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ProfileHeader } from "@/components/profile-header";
import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { BookmarkList } from "@/components/bookmark-list";
import { useBookmarkApp } from "./use-bookmark-app";
import type { BookmarkWithGroup } from "@/app/actions/bookmarks";
import type { GroupWithCount } from "@/lib/types";

const PreviewDialog = dynamic(
  () => import("./preview-dialog").then((m) => ({ default: m.PreviewDialog })),
  { ssr: false, loading: () => null }
);

const ShortcutsDialog = dynamic(
  () => import("./shortcuts-dialog").then((m) => ({ default: m.ShortcutsDialog })),
  { ssr: false, loading: () => null }
);

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
    handleHeroSubmit,
    handleHeroPaste,
    handleBookmarkUpdate,
    handleBookmarkDelete,
    handleBookmarkRefresh,
    previewBookmark,
    setPreviewBookmark,
    showShortcuts,
    setShowShortcuts,
    isSubmitting,
    isTransitionLoading,
    focusedIndex,
    setFocusedIndex,
  } = useBookmarkApp({
    initialBookmarks,
    initialGroups,
    initialSelectedGroupId,
    initialTotalBookmarkCount,
  });

  useEffect(() => {
    if (displayedBookmarks.length > 0) {
      import("./preview-dialog");
      import("./shortcuts-dialog");
    }
  }, [displayedBookmarks.length]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileHeader
        groups={groups}
        totalBookmarkCount={totalBookmarkCount}
        selectedGroupId={selectedGroupId}
        onSelectGroupId={handleSelectGroupId}
        onGroupsChange={refreshGroups}
      />
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
          onBookmarkUpdate={handleBookmarkUpdate}
          onBookmarkDelete={handleBookmarkDelete}
          onBookmarkRefresh={handleBookmarkRefresh}
          onGroupsChange={refreshGroups}
          isTransitionLoading={isTransitionLoading}
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
