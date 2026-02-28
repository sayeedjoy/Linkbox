"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { ProfileHeader } from "@/components/profile-header";
import { BookmarkHeroInput } from "@/components/bookmark-hero-input";
import { BookmarkList } from "@/components/bookmark-list";
import { MultiSelectToolbar } from "@/components/multi-select";
import { MoveToGroupDialog } from "@/components/move-to-group-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    selectionMode,
    selectedIds,
    toggleSelection,
    enterSelectionWithBookmark,
    allDisplayedSelected,
    selectAll,
    clearSelection,
    moveDialogOpen,
    setMoveDialogOpen,
    handleBulkMove,
    handleMoveConfirm,
    handleBulkCopyUrls,
    handleBulkExport,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    requestBulkDelete,
    confirmBulkDelete,
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
    <div
      className="min-h-screen flex flex-col bg-background"
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!selectionMode || selectedIds.size > 0 || target.closest("[role='dialog']")) return;
        clearSelection();
        event.preventDefault();
        event.stopPropagation();
      }}
    >
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
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          onSelectClick={enterSelectionWithBookmark}
        />
      </main>
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <MultiSelectToolbar
            allSelected={allDisplayedSelected}
            onSelectAll={selectAll}
            onMove={handleBulkMove}
            onCopyUrls={handleBulkCopyUrls}
            onExport={handleBulkExport}
            onDelete={requestBulkDelete}
            onClose={clearSelection}
            hasUsername={false}
          />
        )}
      </AnimatePresence>
      <MoveToGroupDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        groups={groups}
        onConfirm={handleMoveConfirm}
      />
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected bookmarks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedIds.size} selected bookmark{selectedIds.size === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PreviewDialog
        bookmark={previewBookmark}
        open={!!previewBookmark}
        onOpenChange={(o) => !o && setPreviewBookmark(null)}
      />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}

