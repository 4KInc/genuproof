import { NextRequest, NextResponse } from "next/server";
import { queryItems, queryGSI1 } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId required" }, { status: 400 });
    }

    // Get all products for this brand
    const products = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", { limit: 200 });

    // Fetch recent scans for each product (parallel, last 50 each)
    const scanResults = await Promise.all(
      products.map((p) =>
        queryItems(`PRODUCT#${p.productId}`, "SCAN#", {
          limit: 50,
          scanForward: false,
        })
      )
    );

    const allScans = scanResults.flat();

    // Aggregate by location
    const locationMap = new Map<
      string,
      { country: string; city: string; count: number; lastScan: string }
    >();

    for (const scan of allScans) {
      const country = scan.country as string;
      const city = scan.city as string;
      if (!country || country === "Unknown") continue;
      const key = `${city},${country}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
        if ((scan.timestamp as string) > existing.lastScan) {
          existing.lastScan = scan.timestamp as string;
        }
      } else {
        locationMap.set(key, {
          country,
          city,
          count: 1,
          lastScan: scan.timestamp as string,
        });
      }
    }

    const locations = [...locationMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Aggregate suspicious scans by location for threat hotspots
    const threatLocationMap = new Map<
      string,
      { country: string; city: string; count: number }
    >();

    for (const scan of allScans) {
      if (scan.result !== "suspicious") continue;
      const country = scan.country as string;
      const city = scan.city as string;
      if (!country || country === "Unknown") continue;
      const key = `${city},${country}`;
      const existing = threatLocationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        threatLocationMap.set(key, { country, city, count: 1 });
      }
    }

    const threatHotspots = [...threatLocationMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      locations,
      threatHotspots,
      totalScans: allScans.length,
    });
  } catch (error) {
    console.error("Brand scans error:", error);
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}
