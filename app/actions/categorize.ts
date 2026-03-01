"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { categorizationModel, isCategorizationEnabled } from "@/lib/ai";
import { publishUserEvent } from "@/lib/realtime";

/* ------------------------------------------------------------------ */
/*  Rate-limiting: per-user cooldown + global concurrency cap          */
/* ------------------------------------------------------------------ */

/** Minimum seconds between AI calls for the same user. */
const USER_COOLDOWN_MS = 5_000;

/** Maximum number of concurrent AI categorization calls across all users. */
const MAX_CONCURRENT = 5;

/** Tracks the last AI call timestamp per userId (in-memory, resets on restart). */
const lastCallByUser = new Map<string, number>();

/** Current number of in-flight AI calls. */
let activeCalls = 0;

function acquireSlot(userId: string): boolean {
  const now = Date.now();

  // Per-user cooldown check
  const lastCall = lastCallByUser.get(userId);
  if (lastCall && now - lastCall < USER_COOLDOWN_MS) {
    return false;
  }

  // Global concurrency check
  if (activeCalls >= MAX_CONCURRENT) {
    return false;
  }

  lastCallByUser.set(userId, now);
  activeCalls++;
  return true;
}

function releaseSlot() {
  activeCalls = Math.max(0, activeCalls - 1);
}

/**
 * Auto-categorize a bookmark into one of the user's existing groups.
 *
 * Designed to be called fire-and-forget after bookmark creation.
 * Silently no-ops when:
 * - OPENROUTER_API_KEY is not set
 * - The user has auto-grouping disabled
 * - The bookmark already has a group
 * - The user has no groups
 * - Rate-limited (per-user cooldown or global concurrency cap)
 * - The AI returns "none" (no good match)
 * - Any error occurs (never throws)
 */
export async function categorizeBookmark(
  bookmarkId: string,
  userId: string
): Promise<void> {
  try {
    if (!isCategorizationEnabled()) {
      console.log("[categorize] Skipped: OPENROUTER_API_KEY not set");
      return;
    }

    // Check if the user has enabled auto-grouping
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { autoGroupEnabled: true },
    });
    if (!user?.autoGroupEnabled) {
      console.log("[categorize] Skipped: autoGroupEnabled is false for user", userId);
      return;
    }

    // Rate-limit: per-user cooldown + global concurrency cap
    if (!acquireSlot(userId)) {
      console.log("[categorize] Skipped: rate-limited for user", userId);
      return;
    }

    try {
      const bookmark = await prisma.bookmark.findFirst({
        where: { id: bookmarkId, userId },
      });
      if (!bookmark || bookmark.groupId) {
        console.log("[categorize] Skipped: bookmark not found or already grouped", { bookmarkId, hasGroup: bookmark?.groupId });
        return;
      }

      const groups = await prisma.group.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true, name: true },
      });
      if (groups.length === 0) {
        console.log("[categorize] Skipped: user has no groups");
        return;
      }

      console.log("[categorize] Running AI classification for bookmark", bookmarkId, "against", groups.length, "groups");

      // Gather recent categorized bookmarks as examples for the AI
      const recentExamples = await prisma.bookmark.findMany({
        where: { userId, groupId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          url: true,
          title: true,
          group: { select: { name: true } },
        },
      });

      const groupList = groups
        .map((g, i) => `${i + 1}. "${g.name}" (id: ${g.id})`)
        .join("\n");

      const examplesSection =
        recentExamples.length > 0
          ? `\nHere are some recent bookmarks and their assigned groups for context:\n${recentExamples
              .map(
                (b) =>
                  `- "${b.title ?? b.url ?? "Untitled"}" → ${b.group?.name ?? "Uncategorized"}`
              )
              .join("\n")}\n`
          : "";

      const bookmarkInfo = [
        bookmark.url ? `URL: ${bookmark.url}` : null,
        bookmark.title ? `Title: ${bookmark.title}` : null,
        bookmark.description
          ? `Description: ${bookmark.description.slice(0, 500)}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { object: result } = await generateObject({
        model: categorizationModel,
        schema: z.object({
          groupId: z
            .string()
            .describe(
              'The ID of the best matching group, or "none" if no group is a good fit'
            ),
          confidence: z.enum(["high", "medium", "low"]),
        }),
        prompt: `You are a bookmark classifier. Given a bookmark and a list of available groups, pick the single most appropriate group for this bookmark.

Available groups:
${groupList}
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

      // Validate the result
      console.log("[categorize] AI result:", JSON.stringify(result));
      if (result.groupId === "none") {
        console.log("[categorize] Skipped: AI returned 'none'");
        return;
      }
      if (result.confidence === "low") {
        console.log("[categorize] Skipped: confidence is 'low'");
        return;
      }

      // Verify the group ID actually belongs to this user
      const validGroup = groups.find((g) => g.id === result.groupId);
      if (!validGroup) {
        console.log("[categorize] Skipped: AI returned invalid groupId", result.groupId);
        return;
      }

      // Update the bookmark with the AI-assigned group
      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: { groupId: result.groupId },
      });

      console.log("[categorize] Assigned bookmark", bookmarkId, "to group", validGroup.name, "(", result.groupId, ") with confidence", result.confidence);

      // Notify realtime subscribers so connected clients re-fetch.
      // We intentionally skip revalidatePath/revalidateTag here because this
      // function runs fire-and-forget outside the original request context,
      // and Next.js disallows cache revalidation from detached async work.
      publishUserEvent(userId, {
        type: "bookmark.category.updated",
        entity: "bookmark",
        id: bookmarkId,
        data: { groupId: result.groupId },
      });
    } finally {
      releaseSlot();
    }
  } catch (err) {
    console.error("[categorize] Error:", err);
  }
}
