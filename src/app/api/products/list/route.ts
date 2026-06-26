import { NextRequest, NextResponse } from "next/server";
import { queryGSI1 } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

    const items = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", {
      limit: limit * 2,
      scanForward: false,
    });

    // Deduplicate by productId
    const seen = new Set<string>();
    const products = items.filter((p) => {
      const id = p.productId as string;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, limit);

    return NextResponse.json({
      products: products.map((p) => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        verificationCode: p.verificationCode,
        hash: p.hash,
        status: p.status,
        scanCount: p.scanCount || 0,
        createdAt: p.createdAt,
      })),
      count: products.length,
    });
  } catch (error) {
    console.error("Products list error:", error);
    return NextResponse.json(
      { error: "Failed to list products" },
      { status: 500 }
    );
  }
}
