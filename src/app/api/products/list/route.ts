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

    const products = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", {
      limit,
      scanForward: false,
    });

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
