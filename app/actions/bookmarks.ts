/**
 * Public entry point for bookmark server actions.
 *
 * Implementation is split by responsibility under `./bookmarks/`:
 *   - `types`     — shared, runtime-erased types
 *   - `shared`    — server-only internal helpers (not server actions)
 *   - `queries`   — read actions (cached list + count)
 *   - `mutations` — single-item create/update/delete/refresh actions
 *   - `import`    — bulk import + preview actions
 *
 * This barrel keeps the original `@/app/actions/bookmarks` import path stable.
 * Types are re-exported with `export type` so this module never pulls server-only
 * code into client bundles that only need the types.
 */
export type {
  BookmarkWithGroup,
  RefreshBookmarkForUserResult,
  ImportBookmarkItem,
} from "./bookmarks/types";

export { getBookmarks, getTotalBookmarkCount } from "./bookmarks/queries";

export {
  createBookmark,
  createBookmarkFromMetadata,
  createBookmarkFromMetadataForUser,
  createNote,
  updateBookmark,
  deleteBookmark,
  updateBookmarkCategoryForUser,
  refreshBookmark,
  refreshBookmarkForUser,
} from "./bookmarks/mutations";

export { previewImportBookmarks, importBookmarks } from "./bookmarks/import";
