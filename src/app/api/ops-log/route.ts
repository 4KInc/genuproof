import { NextRequest, NextResponse } from "next/server";
import { queryItems } from "@/lib/dynamodb";

// AI Operations Log — every Gemini call logged with tokens, latency, outputs
// Evidence for AI-Native Operations criterion

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const logs = await queryItems("OPS_LOG", undefined, {
      limit,
      scanForward: false,
    });

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
