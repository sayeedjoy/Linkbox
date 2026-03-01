import { prisma } from "@/lib/prisma";
import { isExtensionOrigin, resolveApiUserId } from "@/lib/api-auth";
import { subscribeUserEvents, type RealtimeEvent } from "@/lib/realtime";

const HEARTBEAT_INTERVAL_MS = 20_000;
const POLL_INTERVAL_MS = 1_500;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin && isExtensionOrigin(origin)) {
    return { "Access-Control-Allow-Origin": origin };
  }
  return {};
}

function encodeSseEvent(event: RealtimeEvent, eventId: string): Uint8Array {
  const payload = JSON.stringify(event);
  return new TextEncoder().encode(`id: ${eventId}\ndata: ${payload}\n\n`);
}

async function getBookmarkSignature(userId: string): Promise<string> {
  const [bookmarkAgg, groups] = await Promise.all([
    prisma.bookmark.aggregate({
      where: { userId },
      _count: { _all: true },
      _max: { createdAt: true, updatedAt: true },
    }),
    prisma.group.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, order: true },
      orderBy: { order: "asc" },
    }),
  ]);
  // Build a lightweight group fingerprint so polling detects create/update/delete/reorder.
  const groupSig = groups
    .map((g) => `${g.id}:${g.name}:${g.color ?? ""}:${g.order}`)
    .join(",");
  return [
    bookmarkAgg._count._all ?? 0,
    bookmarkAgg._max.createdAt?.toISOString() ?? "",
    bookmarkAgg._max.updatedAt?.toISOString() ?? "",
    groups.length,
    groupSig,
  ].join("|");
}

export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }

  let unsubscribe = () => {};
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let lastBookmarkSignature = await getBookmarkSignature(userId);
  let closed = false;
  let counter = Number.parseInt(new URL(request.url).searchParams.get("lastEventId") ?? "0", 10);
  if (!Number.isFinite(counter) || counter < 0) counter = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
          unsubscribe();
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          if (pollTimer) clearInterval(pollTimer);
        }
      };

      const emitEvent = (event: RealtimeEvent) => {
        counter += 1;
        enqueue(encodeSseEvent(event, String(counter)));
      };

      emitEvent({
        type: "bookmark.updated",
        userId,
        entity: "bookmark",
        id: "initial",
        timestamp: new Date().toISOString(),
        data: { connected: true },
      });

      unsubscribe = subscribeUserEvents(userId, (event) => {
        emitEvent(event);
      });

      pollTimer = setInterval(() => {
        void (async () => {
          try {
            const nextSignature = await getBookmarkSignature(userId);
            if (nextSignature === lastBookmarkSignature) return;
            lastBookmarkSignature = nextSignature;
            emitEvent({
              type: "bookmark.updated",
              userId,
              entity: "bookmark",
              id: "poll",
              timestamp: new Date().toISOString(),
              data: { source: "poll" },
            });
          } catch {
            // Keep the stream alive and retry on next poll tick.
          }
        })();
      }, POLL_INTERVAL_MS);

      heartbeatTimer = setInterval(() => {
        enqueue(new TextEncoder().encode(`: ping\n\n`));
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (pollTimer) clearInterval(pollTimer);
        try {
          controller.close();
        } catch {
          // Ignore double-close races on disconnect.
        }
      });
    },
    cancel() {
      closed = true;
      unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...corsHeaders(request),
    },
  });
}

export async function OPTIONS(request: Request) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = request.headers.get("Origin");
  if (origin && isExtensionOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return new Response(null, { status: 204, headers });
}
