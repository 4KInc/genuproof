import { NextRequest } from "next/server";
import { queryItems } from "@/lib/dynamodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-Sent Events endpoint for real-time threat alerts
// Polls DynamoDB every 3 seconds for new threats and streams them to the client
export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return new Response("brandId required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastTimestamp = new Date().toISOString();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ brandId, timestamp: lastTimestamp })}\n\n`)
      );

      const poll = async () => {
        if (closed) return;

        try {
          // Query threats via GSI1 — works across monthly-bucketed THREAT partitions
          const { queryGSI1 } = await import("@/lib/dynamodb");
          let threats = await queryGSI1(`BRAND#${brandId}`, `THREAT#${lastTimestamp}`, {
            limit: 10,
            scanForward: true,
          });
          // Fallback: legacy unbucketed partition
          if (threats.length === 0) {
            threats = await queryItems(`THREAT#${brandId}`, `ALERT#${lastTimestamp}`, {
              limit: 10,
              scanForward: true,
            });
          }

          for (const threat of threats) {
            const ts = threat.timestamp as string;
            if (ts > lastTimestamp) {
              const event = {
                type: threat.type,
                severity: threat.severity,
                productId: threat.productId,
                details: threat.details,
                timestamp: ts,
                source: threat.source || "api",
              };
              controller.enqueue(
                encoder.encode(`event: threat\ndata: ${JSON.stringify(event)}\n\n`)
              );
              lastTimestamp = ts;
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`)
          );
        } catch (err) {
          console.error("SSE poll error:", err);
        }

        // Poll every 3 seconds
        if (!closed) {
          setTimeout(poll, 3000);
        }
      };

      // Start polling
      poll();

      // Clean up on abort
      req.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
