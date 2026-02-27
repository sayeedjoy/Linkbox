import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { subscribeUserEvents, type RealtimeEvent } from "@/lib/realtime";

const HEARTBEAT_INTERVAL_MS = 20_000;

function encodeSseData(event: RealtimeEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let unsubscribe = () => {};
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch {
          unsubscribe();
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      };

      enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            type: "bookmark.updated",
            userId,
            entity: "bookmark",
            id: "initial",
            timestamp: new Date().toISOString(),
            data: { connected: true },
          })}\n\n`
        )
      );

      unsubscribe = subscribeUserEvents(userId, (event) => {
        enqueue(encodeSseData(event));
      });

      heartbeatTimer = setInterval(() => {
        enqueue(new TextEncoder().encode(`: ping\n\n`));
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // Ignore double-close races on disconnect.
        }
      });
    },
    cancel() {
      unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
