"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { db, users, bookmarks, groups } from "@/lib/db";
import { getCategorizationModel, isCategorizationEnabled } from "@/lib/ai";
import { publishUserEvent } from "@/lib/realtime";

/* ------------------------------------------------------------------ */
/*  Rate-limiting: per-user cooldown + global concurrency cap          */
/* ------------------------------------------------------------------ */

const USER_COOLDOWN_MS = 5_000;
const MAX_CONCURRENT = 5;
const BACKFILL_DELAY_MS = 3_000;

const lastCallByUser = new Map<string, number>();
let activeCalls = 0;
const activeBackfills = new Set<string>();

function acquireSlot(userId: string): boolean {
  const now = Date.now();
  const lastCall = lastCallByUser.get(userId);
  if (lastCall && now - lastCall < USER_COOLDOWN_MS) return false;
  if (activeCalls >= MAX_CONCURRENT) return false;
  lastCallByUser.set(userId, now);
  activeCalls++;
  return true;
}

function acquireBackfillSlot(): boolean {
  if (activeCalls >= MAX_CONCURRENT) return false;
  activeCalls++;
  return true;
}

function releaseSlot() {
  activeCalls = Math.max(0, activeCalls - 1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/*  Core: classify a single bookmark                                   */
/* ------------------------------------------------------------------ */

async function classifyBookmark(bookmarkId: string, userId: string): Promise<boolean> {
  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
    .limit(1);
  if (!bookmark || bookmark.groupId) return false;

  const groupList = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.userId, userId))
    .orderBy(groups.order);
  if (groupList.length === 0) return false;

  const recentExamples = await db.query.bookmarks.findMany({
    where: and(eq(bookmarks.userId, userId), isNotNull(bookmarks.groupId)),
    orderBy: desc(bookmarks.createdAt),
    limit: 10,
    columns: { url: true, title: true },
    with: { group: { columns: { name: true } } },
  });

  const groupListStr = groupList.map((g, i) => `${i + 1}. "${g.name}" (id: ${g.id})`).join("\n");

  const examplesSection =
    recentExamples.length > 0
      ? `\nHere are some recent bookmarks and their assigned groups for context:\n${recentExamples
          .map((b) => `- "${b.title ?? b.url ?? "Untitled"}" → ${b.group?.name ?? "Uncategorized"}`)
          .join("\n")}\n`
      : "";

  const bookmarkInfo = [
    bookmark.url ? `URL: ${bookmark.url}` : null,
    bookmark.title ? `Title: ${bookmark.title}` : null,
    bookmark.description ? `Description: ${bookmark.description.slice(0, 500)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const categorizationModel = await getCategorizationModel();
  if (!categorizationModel) return false;

  const { object: result } = await generateObject({
    model: categorizationModel,
    schema: z.object({
      groupId: z.string().describe('The ID of the best matching group, or "none" if no group is a good fit'),
      confidence: z.enum(["high", "medium", "low"]),
    }),
    prompt: `You are a bookmark classifier. Given a bookmark and a list of available groups, pick the single most appropriate group for this bookmark.

Available groups:
${groupListStr}
${examplesSection}
Bookmark to classify:
${bookmarkInfo}

Rules:
- Only pick from the available group IDs listed above.
- If none of the groups are a reasonable fit, respond with groupId "none".
- Consider the URL domain, page title, and description to infer the topic.
- Common patterns: social media posts (tweets/threads), design tools (Figma, Dribbble), articles, research papers, videos, developer tools, AI/ML resources, etc.
- Prefer specificity: if a bookmark fits multiple groups, pick the most specific one.`,
    temperature: 0,
  });

  if (result.groupId === "none" || result.confidence === "low") return false;

  const validGroup = groupList.find((g) => g.id === result.groupId);
  if (!validGroup) return false;

  await db.update(bookmarks).set({ groupId: result.groupId, updatedAt: new Date() }).where(eq(bookmarks.id, bookmarkId));

  publishUserEvent(userId, {
    type: "bookmark.category.updated",
    entity: "bookmark",
    id: bookmarkId,
    data: { groupId: result.groupId },
  });

  return true;
}

/* ------------------------------------------------------------------ */
/*  Public: categorize a single newly-created bookmark                 */
/* ------------------------------------------------------------------ */

export async function categorizeBookmark(bookmarkId: string, userId: string): Promise<void> {
  try {
    if (!(await isCategorizationEnabled())) return;

    const [user] = await db
      .select({ autoGroupEnabled: users.autoGroupEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.autoGroupEnabled) return;

    if (!acquireSlot(userId)) return;

    try {
      await classifyBookmark(bookmarkId, userId);
    } finally {
      releaseSlot();
    }
  } catch (err) {
    console.error("[categorize] Error:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Public: backfill all ungrouped bookmarks for a user                */
/* ------------------------------------------------------------------ */

export async function backfillUngroupedBookmarks(userId: string): Promise<void> {
  if (!(await isCategorizationEnabled())) return;
  if (activeBackfills.has(userId)) return;

  activeBackfills.add(userId);

  try {
    const ungrouped = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.groupId)))
      .orderBy(desc(bookmarks.createdAt));

    for (const { id } of ungrouped) {
      let retries = 0;
      while (!acquireBackfillSlot()) {
        if (retries++ > 60) return;
        await sleep(1_000);
      }

      try {
        await classifyBookmark(id, userId);
      } catch (err) {
        console.error("[backfill] Error classifying bookmark", id, ":", err);
      } finally {
        releaseSlot();
      }

      await sleep(BACKFILL_DELAY_MS);
    }
  } catch (err) {
    console.error("[backfill] Error:", err);
  } finally {
    activeBackfills.delete(userId);
  }
}
