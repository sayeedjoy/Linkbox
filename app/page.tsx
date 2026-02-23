import { getBookmarks } from "@/app/actions/bookmarks";
import { getGroups } from "@/app/actions/groups";
import { BookmarkApp } from "@/components/bookmark-app";

export default async function Page() {
  const [initialBookmarks, initialGroups] = await Promise.all([
    getBookmarks({ sort: "createdAt", order: "desc" }),
    getGroups(),
  ]);
  return (
    <BookmarkApp
      initialBookmarks={initialBookmarks}
      initialGroups={initialGroups}
    />
  );
}
