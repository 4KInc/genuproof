import { NextRequest, NextResponse } from "next/server";
import { queryItems, queryGSI1 } from "@/lib/dynamodb";

// Public product listing — uses PRODUCT_INDEX collection key (no Scan)
// Every product registration writes to PRODUCT_INDEX / PRODUCT#timestamp

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const status = req.nextUrl.searchParams.get("status") || "active";

    // Query the product index — avoids table Scan
    let items = await queryItems("PRODUCT_INDEX", "PRODUCT#", {
      limit: limit * 2,
      scanForward: false,
    });

    // Fallback: legacy Scan for pre-index data
    if (items.length === 0) {
      const { ddb, TABLE_NAME } = await import("@/lib/dynamodb");
      const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
      const result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #s = :status",
          ExpressionAttributeValues: {
            ":prefix": "PRODUCT#",
            ":sk": "META",
            ":status": status,
          },
          ExpressionAttributeNames: { "#s": "status" },
          Limit: limit * 3,
        })
      );
      items = result.Items || [];
    }

    const products = items
      .filter((p) => (p.status || "active") === status)
      .slice(0, limit)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        brandName: p.brandName,
        sku: p.sku,
        category: p.category,
        description: p.description,
        status: p.status || "active",
        verificationCode: p.verificationCode,
        hash: ((p.hash as string) || "").slice(0, 16) + "...",
        createdAt: p.createdAt,
        scanCount: p.scanCount || 0,
      }));

    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    console.error("Explore error:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
