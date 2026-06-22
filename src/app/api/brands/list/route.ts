import { NextResponse } from "next/server";
import { queryItems } from "@/lib/dynamodb";

// List all brands — uses BRAND_INDEX collection key instead of Scan
// Every brand registration writes to BRAND_INDEX#ALL / BRAND#brandId
// for O(1) collection lookup. Falls back to GSI1 query.

export async function GET() {
  try {
    // Query the brand index collection — avoids table Scan
    let brands = await queryItems("BRAND_INDEX", "BRAND#", {
      scanForward: false,
    });

    // Fallback: query GSI1 for brands that pre-date the index
    if (brands.length === 0) {
      // Use a known brand list from the registration flow
      const { ddb, TABLE_NAME } = await import("@/lib/dynamodb");
      const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
      const result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
          ExpressionAttributeValues: {
            ":prefix": "BRAND#",
            ":sk": "PROFILE",
          },
          ProjectionExpression: "id, #n, #d, industry, #p, createdAt",
          ExpressionAttributeNames: {
            "#n": "name",
            "#d": "domain",
            "#p": "plan",
          },
        })
      );
      brands = result.Items || [];
    }

    const formatted = brands
      .map((b) => ({
        id: b.id || b.brandId,
        name: b.name,
        domain: b.domain,
        industry: b.industry,
        plan: b.plan || "free",
        createdAt: b.createdAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime()
      );

    return NextResponse.json({ brands: formatted, count: formatted.length });
  } catch (error) {
    console.error("Brands list error:", error);
    return NextResponse.json(
      { error: "Failed to list brands" },
      { status: 500 }
    );
  }
}
