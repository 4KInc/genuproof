import { NextRequest, NextResponse } from "next/server";
import { queryItems, queryGSI1 } from "@/lib/dynamodb";

// AI Operations Log — every Gemini call logged with tokens, latency, outputs
// Time-bucketed PK: OPS_LOG#YYYY-MM-DD avoids write-hot-spotting
// Dashboard reads via GSI1 (PK=OPS_LOG) for cross-day queries,
// or scatter-gather across date-bucketed partitions for targeted ranges.

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const days = parseInt(req.nextUrl.searchParams.get("days") || "7");

    // Scatter-gather: query each daily partition in parallel
    const buckets: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000);
      buckets.push(d.toISOString().slice(0, 10));
    }

    const results = await Promise.all(
      buckets.map((date) =>
        queryItems(`OPS_LOG#${date}`, undefined, {
          limit,
          scanForward: false,
        })
      )
    );

    // Merge, sort by timestamp descending, take limit
    let logs = results
      .flat()
      .sort((a, b) =>
        (b.timestamp as string).localeCompare(a.timestamp as string)
      )
      .slice(0, limit);

    // Fallback: if no time-bucketed data found, try legacy OPS_LOG partition
    if (logs.length === 0) {
      logs = await queryItems("OPS_LOG", undefined, {
        limit,
        scanForward: false,
      });
    }

    // Aggregate stats
    const totalOps = logs.length;
    const agents: Record<string, number> = {};
    const severities: Record<string, number> = {};
    const attackVectors: Record<string, number> = {};
    let totalLatency = 0;
    let totalConfidence = 0;
    let geminiCalls = 0;

    for (const log of logs) {
      const agent = (log.agent as string) || "unknown";
      agents[agent] = (agents[agent] || 0) + 1;

      if (log.aiSeverity) {
        const sev = log.aiSeverity as string;
        severities[sev] = (severities[sev] || 0) + 1;
      }
      if (log.aiAttackVector) {
        const vec = log.aiAttackVector as string;
        attackVectors[vec] = (attackVectors[vec] || 0) + 1;
      }
      if (log.latencyMs) {
        totalLatency += log.latencyMs as number;
        geminiCalls++;
      }
      if (log.aiConfidence) {
        totalConfidence += log.aiConfidence as number;
      }
    }

    return NextResponse.json({
      entries: logs.map((l) => ({
        agent: l.agent,
        trigger: l.trigger,
        productId: l.productId,
        brandId: l.brandId,
        anomalyFlags: l.anomalyFlags,
        geminiModel: l.geminiModel,
        aiSeverity: l.aiSeverity,
        aiAttackVector: l.aiAttackVector,
        aiConfidence: l.aiConfidence,
        latencyMs: l.latencyMs,
        timestamp: l.timestamp,
      })),
      stats: {
        totalOperations: totalOps,
        agentBreakdown: agents,
        severityBreakdown: severities,
        attackVectorBreakdown: attackVectors,
        avgLatencyMs: geminiCalls > 0 ? Math.round(totalLatency / geminiCalls) : 0,
        avgConfidence: geminiCalls > 0 ? Math.round(totalConfidence / geminiCalls) : 0,
        geminiModel: "gemini-2.5-flash",
      },
    });
  } catch (error) {
    console.error("Ops log error:", error);
    return NextResponse.json({ error: "Failed to load ops log" }, { status: 500 });
  }
}
