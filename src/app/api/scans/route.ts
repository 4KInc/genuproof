import { NextRequest, NextResponse } from "next/server";
import { queryItems } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    const scans = await queryItems(`PRODUCT#${productId}`, "SCAN#", {
      limit,
      scanForward: false,
    });

    // Aggregate by location
    const locationMap = new Map<
      string,
      { country: string; city: string; count: number; lastScan: string }
    >();

    for (const scan of scans) {
      const key = `${scan.city},${scan.country}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
        if (scan.timestamp as string > existing.lastScan) {
          existing.lastScan = scan.timestamp as string;
        }
      } else {
        locationMap.set(key, {
          country: scan.country as string,
          city: scan.city as string,
          count: 1,
          lastScan: scan.timestamp as string,
        });
      }
    }

    const locations = [...locationMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      scans: scans.map((s) => ({
        timestamp: s.timestamp,
        country: s.country,
        city: s.city,
        result: s.result,
      })),
      locations,
      totalScans: scans.length,
    });
  } catch (error) {
    console.error("Scans fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}
