"use server";

import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db, bookmarks, groups } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { publishUserEvent } from "@/lib/realtime";
import { consumeBookmarkQuota } from "@/lib/api-quota";
import { getPlanFeaturesForUser, resolveGroupColorForPlan } from "@/lib/plan-entitlements";
import type { ImportBookmarkItem } from "./types";
import { MAX_IMPORT_ITEMS, revalidateBookmarkData, publishBookmarkEvent, touchBookmark } from "./shared";

function normalizeImportBookmarkItem(item: ImportBookmarkItem) {
  const url = typeof item.url === "string" ? item.url.trim() : "";
  const title = typeof item.title === "string" ? item.title : null;
  const description = typeof item.description === "string" ? item.description : null;
  const faviconUrl = typeof item.faviconUrl === "string" ? item.faviconUrl : null;
  const previewImageUrl = typeof item.previewImageUrl === "string" ? item.previewImageUrl : null;
  const groupName = typeof item.group === "string" ? item.group.trim() : "";
  const groupColor = typeof item.groupColor === "string" ? item.groupColor : null;
  const isNote = !url && !!description;
  let createdAt: Date | null = null;
  if (typeof item.createdAt === "string") {
    const parsed = new Date(item.createdAt);
    if (!isNaN(parsed.getTime())) createdAt = parsed;
  }
  return { url, title, description, faviconUrl, previewImageUrl, groupName: groupName || null, groupColor, isNote, createdAt };
}

export async function previewImportBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) return { total: 0, duplicateCount: 0, invalidCount: 0 };
  if (items.length > MAX_IMPORT_ITEMS) {
    return { total: items.length, duplicateCount: 0, invalidCount: 0, error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items` };
  }

  const groupList = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.userId, userId));
  const groupByName = new Map<string, string>();
  for (const g of groupList) groupByName.set(g.name.trim().toLowerCase(), g.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);

  const pendingGroupNames = new Set<string>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (!groupByName.has(key)) pendingGroupNames.add(key);
  }

  const validUrls = Array.from(new Set(normalizedItems.filter((item) => item.url && item.url.startsWith("http")).map((item) => item.url)));
  const existingBookmarks = validUrls.length
    ? await db.select({ id: bookmarks.id, url: bookmarks.url, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), inArray(bookmarks.url, validUrls)))
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarks) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  const existingNotes = await db.select({ id: bookmarks.id, title: bookmarks.title, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), isNull(bookmarks.url)));
  const existingNoteByKey = new Map<string, string>();
  for (const note of existingNotes) {
    existingNoteByKey.set(`${note.title ?? ""}::${note.groupId ?? "null"}`, note.id);
  }

  let total = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  const seenKeys = new Set<string>();

  for (const item of normalizedItems) {
    total += 1;
    const isValidUrl = item.url && item.url.startsWith("http");
    if (!isValidUrl && !item.isNote) { invalidCount += 1; continue; }

    let groupId: string | null = null;
    if (item.groupName) {
      const key = item.groupName.toLowerCase();
      if (groupByName.has(key)) groupId = groupByName.get(key)!;
      else if (pendingGroupNames.has(key)) groupId = `__pending__${key}`;
    }

    let dedupKey: string;
    if (item.isNote) {
      const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
      dedupKey = `note::${noteTitle}::${groupId ?? "null"}`;
      if (!groupId?.startsWith("__pending__")) {
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        if (existingNoteByKey.has(noteKey)) { if (!seenKeys.has(dedupKey)) duplicateCount += 1; }
      }
    } else {
      dedupKey = `${item.url}::${groupId ?? "null"}`;
      if (!groupId?.startsWith("__pending__") && existingByKey.has(dedupKey)) { if (!seenKeys.has(dedupKey)) duplicateCount += 1; }
    }

    if (seenKeys.has(dedupKey)) duplicateCount += 1;
    seenKeys.add(dedupKey);
  }

  return { total, duplicateCount, invalidCount };
}

export async function importBookmarks(items: ImportBookmarkItem[]) {
  const userId = await currentUserId();
  if (!Array.isArray(items)) return { error: "Invalid import payload" };
  if (items.length > MAX_IMPORT_ITEMS) return { error: `Import exceeds maximum of ${MAX_IMPORT_ITEMS} items` };
  const planFeatures = await getPlanFeaturesForUser(userId);

  const groupList = await db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.userId, userId));
  const groupByName = new Map<string, string>();
  for (const g of groupList) groupByName.set(g.name.trim().toLowerCase(), g.id);

  const normalizedItems = items.map(normalizeImportBookmarkItem);
  const validUrls = Array.from(new Set(normalizedItems.filter((item) => item.url && item.url.startsWith("http")).map((item) => item.url)));
  const pendingGroupCreates = new Map<string, { name: string; color: string | null }>();
  for (const item of normalizedItems) {
    if (!item.groupName) continue;
    const key = item.groupName.toLowerCase();
    if (groupByName.has(key) || pendingGroupCreates.has(key)) continue;
    pendingGroupCreates.set(key, {
      name: item.groupName,
      color: resolveGroupColorForPlan(planFeatures.groupColoringAllowed, item.groupColor),
    });
  }

  const existingBookmarkRows = validUrls.length
    ? await db.select({ id: bookmarks.id, url: bookmarks.url, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), inArray(bookmarks.url, validUrls)))
    : [];
  const existingByKey = new Map<string, string>();
  for (const bookmark of existingBookmarkRows) {
    existingByKey.set(`${bookmark.url}::${bookmark.groupId ?? "null"}`, bookmark.id);
  }

  const existingNotes = await db.select({ id: bookmarks.id, title: bookmarks.title, groupId: bookmarks.groupId }).from(bookmarks).where(and(eq(bookmarks.userId, userId), isNull(bookmarks.url)));
  const existingNoteByKey = new Map<string, string>();
  for (const note of existingNotes) {
    existingNoteByKey.set(`${note.title ?? ""}::${note.groupId ?? "null"}`, note.id);
  }

  // Simulate the tx loop's dedupe to compute how many rows would be inserted (creates).
  // Quota is charged for this count BEFORE the transaction so an over-cap import does
  // not write rows that escape enforcement.
  let wouldCreate = 0;
  {
    const simExistingByKey = new Map(existingByKey);
    const simExistingNoteByKey = new Map(existingNoteByKey);
    const pendingGroupKeys = pendingGroupCreates;
    for (const item of normalizedItems) {
      const isValidUrl = item.url && item.url.startsWith("http");
      if (!isValidUrl && !item.isNote) continue;
      let groupKey: string | null = null;
      if (item.groupName) {
        const k = item.groupName.toLowerCase();
        if (groupByName.has(k)) {
          groupKey = groupByName.get(k)!;
        } else if (pendingGroupKeys.has(k)) {
          // Pending groups have no DB rows yet; use a sentinel key so within-batch dedupe still works.
          groupKey = `__pending__${k}`;
        }
      }
      if (item.isNote) {
        const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
        const noteKey = `${noteTitle}::${groupKey ?? "null"}`;
        if (simExistingNoteByKey.has(noteKey)) continue;
        wouldCreate += 1;
        simExistingNoteByKey.set(noteKey, "__sim__");
        continue;
      }
      const urlKey = `${item.url}::${groupKey ?? "null"}`;
      if (simExistingByKey.has(urlKey)) continue;
      wouldCreate += 1;
      simExistingByKey.set(urlKey, "__sim__");
    }
  }

  if (wouldCreate > 0) {
    const quotaCheck = await consumeBookmarkQuota(userId, wouldCreate, planFeatures);
    if (!quotaCheck.ok) {
      return {
        error: `Monthly bookmark limit reached (${quotaCheck.limit}). Resets at ${quotaCheck.resetsAt}.`,
      };
    }
  }

  let created = 0;
  let updated = 0;
  let invalidCount = 0;
  const createdGroupIds: string[] = [];
  const createdBookmarkEvents: Array<{ id: string; groupId: string | null }> = [];
  const updatedBookmarkEvents: Array<{ id: string; groupId: string | null }> = [];

  await db.transaction(async (tx) => {
    const [{ maxOrder }] = await tx
      .select({ maxOrder: sql<number>`coalesce(max(${groups.order}), -1)` })
      .from(groups)
      .where(eq(groups.userId, userId));
    let nextOrder = (maxOrder ?? -1) + 1;

    for (const [key, groupData] of pendingGroupCreates.entries()) {
      const [createdGroup] = await tx
        .insert(groups)
        .values({ userId, name: groupData.name, color: groupData.color, order: nextOrder })
        .returning({ id: groups.id });
      nextOrder += 1;
      groupByName.set(key, createdGroup.id);
      createdGroupIds.push(createdGroup.id);
    }

    for (const item of normalizedItems) {
      const isValidUrl = item.url && item.url.startsWith("http");
      if (!isValidUrl && !item.isNote) { invalidCount += 1; continue; }
      const groupId = item.groupName ? (groupByName.get(item.groupName.toLowerCase()) ?? null) : null;

      if (item.isNote) {
        const noteTitle = item.description?.split(/\r?\n/)[0]?.slice(0, 500) ?? "Note";
        const noteKey = `${noteTitle}::${groupId ?? "null"}`;
        const existingNoteId = existingNoteByKey.get(noteKey);
        if (existingNoteId) {
          await tx.update(bookmarks).set({ groupId, title: noteTitle, description: item.description, ...touchBookmark() }).where(eq(bookmarks.id, existingNoteId));
          updated += 1;
          updatedBookmarkEvents.push({ id: existingNoteId, groupId });
        } else {
          const timestamp = item.createdAt ?? new Date();
          const [note] = await tx.insert(bookmarks).values({
            userId, groupId, url: null, title: noteTitle, description: item.description,
            faviconUrl: null, previewImageUrl: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          }).returning({ id: bookmarks.id });
          created += 1;
          existingNoteByKey.set(noteKey, note.id);
          createdBookmarkEvents.push({ id: note.id, groupId });
        }
        continue;
      }

      const existingKey = `${item.url}::${groupId ?? "null"}`;
      const existingId = existingByKey.get(existingKey);
      if (existingId) {
        await tx.update(bookmarks).set({ groupId, title: item.title, description: item.description, faviconUrl: item.faviconUrl, previewImageUrl: item.previewImageUrl, ...touchBookmark() }).where(eq(bookmarks.id, existingId));
        updated += 1;
        updatedBookmarkEvents.push({ id: existingId, groupId });
        continue;
      }
      const timestamp = item.createdAt ?? new Date();
      const [bookmark] = await tx.insert(bookmarks).values({
        userId, groupId, url: item.url, title: item.title, description: item.description,
        faviconUrl: item.faviconUrl, previewImageUrl: item.previewImageUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).returning({ id: bookmarks.id });
      created += 1;
      existingByKey.set(existingKey, bookmark.id);
      createdBookmarkEvents.push({ id: bookmark.id, groupId });
    }
  });

  for (const id of createdGroupIds) {
    publishUserEvent(userId, { type: "group.created", entity: "group", id });
  }
  for (const event of updatedBookmarkEvents) {
    publishBookmarkEvent(userId, "bookmark.updated", event.id, { groupId: event.groupId });
  }
  for (const event of createdBookmarkEvents) {
    publishBookmarkEvent(userId, "bookmark.created", event.id, { groupId: event.groupId });
  }
  revalidateBookmarkData();
  return { ok: true, created, updated, invalidCount };
}
