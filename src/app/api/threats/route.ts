import { NextRequest, NextResponse } from "next/server";
import { queryItems, queryGSI1 } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    // Query via GSI1 (BRAND#brandId / THREAT#timestamp) — works across
    // monthly-bucketed THREAT partitions without scatter-gather
    let threats = await queryGSI1(`BRAND#${brandId}`, "THREAT#", {
      limit,
      scanForward: false,
    });

    // Fallback: try legacy unbucketed THREAT#brandId partition
    if (threats.length === 0) {
      threats = await queryItems(`THREAT#${brandId}`, "ALERT#", {
        limit,
        scanForward: false,
      });
    }

    return NextResponse.json({
      threats: threats.map((t) => ({
        type: t.type,
        severity: t.severity,
        productId: t.productId,
        details: t.details,
        timestamp: t.timestamp,
        resolved: t.resolved,
      })),
      count: threats.length,
    });
  } catch (error) {
    console.error("Threats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threats" },
      { status: 500 }
    );
  }
}
