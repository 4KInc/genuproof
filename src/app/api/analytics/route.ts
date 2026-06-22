import { NextRequest, NextResponse } from "next/server";
import { queryItems, queryGSI1 } from "@/lib/dynamodb";

// Analytics — uses collection keys and GSI1 queries instead of table Scan
// Products via PRODUCT_INDEX, scans via per-product SCAN# queries

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");

    // Get products from PRODUCT_INDEX (no Scan)
    let products = await queryItems("PRODUCT_INDEX", "PRODUCT#", {
      limit: 500,
      scanForward: false,
    });

    // Fallback: if no index, use GSI1 per-brand query
    if (products.length === 0 && brandId) {
      products = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", {
        limit: 500,
        scanForward: false,
      });
    }

    // Filter by brand if specified
    if (brandId) {
      products = products.filter((p) => p.brandId === brandId);
    }

    // Category and status breakdown from product index
    const categoryMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    for (const p of products) {
      const cat = (p.category as string) || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      const s = (p.status as string) || "active";
      statusMap[s] = (statusMap[s] || 0) + 1;
    }

    // Get scans: query per-product SCAN# records for recent products (top 50)
    const recentProducts = products.slice(0, 50);
    const scanResults = await Promise.all(
      recentProducts.map((p) =>
        queryItems(`PRODUCT#${p.productId}`, "SCAN#", {
          limit: 50,
          scanForward: false,
        })
      )
    );
    const scans = scanResults.flat();

    // Scans per day (last 7 days)
    const now = Date.now();
    const dailyScans: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      dailyScans[d.toISOString().slice(0, 10)] = 0;
    }
    for (const scan of scans) {
      const day = (scan.timestamp as string).slice(0, 10);
      if (dailyScans[day] !== undefined) dailyScans[day]++;
    }

    // Scans by country
    const countryMap: Record<string, number> = {};
    for (const scan of scans) {
      const country = (scan.country as string) || "Unknown";
      countryMap[country] = (countryMap[country] || 0) + 1;
    }
    const topCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // Scans by result
    const resultMap: Record<string, number> = {};
    for (const scan of scans) {
      const result = (scan.result as string) || "unknown";
      resultMap[result] = (resultMap[result] || 0) + 1;
    }

    // Scans by hour of day
    const hourlyMap: number[] = new Array(24).fill(0);
    for (const scan of scans) {
      const hour = new Date(scan.timestamp as string).getHours();
      hourlyMap[hour]++;
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return NextResponse.json({
      totalScans: scans.length,
      totalProducts: products.length,
      dailyScans: Object.entries(dailyScans).map(([date, count]) => ({ date, count })),
      topCountries,
      resultBreakdown: resultMap,
      hourlyDistribution: hourlyMap,
      categoryBreakdown,
      statusBreakdown: statusMap,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
