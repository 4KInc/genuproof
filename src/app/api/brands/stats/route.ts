import { NextRequest, NextResponse } from "next/server";
import { getItem, queryItems, queryGSI1 } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId required" }, { status: 400 });
    }

    // Get brand stats counter
    const stats = await getItem(`BRAND#${brandId}`, "STATS");

    // Get products to sum scan counts
    const products = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", { limit: 500 });

    const totalScans = products.reduce(
      (sum, p) => sum + ((p.scanCount as number) || 0),
      0
    );

    const activeProducts = products.filter((p) => p.status === "active").length;
    const recalledProducts = products.filter((p) => p.status === "recalled").length;
    const transferredProducts = products.filter((p) => p.status === "transferred").length;

    // Get recent threats
    const threats = await queryItems(`THREAT#${brandId}`, "ALERT#", {
      limit: 50,
      scanForward: false,
    });

    const unresolvedThreats = threats.filter((t) => !t.resolved).length;

    return NextResponse.json({
      productCount: products.length,
      activeProducts,
      recalledProducts,
      transferredProducts,
      totalScans,
      threatCount: threats.length,
      unresolvedThreats,
      statsCounter: {
        productCount: (stats?.productCount as number) || 0,
        scanCount: (stats?.scanCount as number) || 0,
        threatCount: (stats?.threatCount as number) || 0,
      },
    });
  } catch (error) {
    console.error("Brand stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
