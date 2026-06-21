import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");

    // Get all scans
    const scanFilter = brandId
      ? "begins_with(PK, :prefix) AND begins_with(SK, :sk)"
      : "begins_with(SK, :sk)";
    const scanResult = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: scanFilter,
        ExpressionAttributeValues: {
          ...(brandId ? { ":prefix": `PRODUCT#` } : {}),
          ":sk": "SCAN#",
        },
        Limit: 500,
      })
    );

    const scans = scanResult.Items || [];

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

    // Get all products for category breakdown
    const productResult = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        Limit: 500,
      })
    );
    const products = productResult.Items || [];

    const categoryMap: Record<string, number> = {};
    for (const p of products) {
      const cat = (p.category as string) || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    const statusMap: Record<string, number> = {};
    for (const p of products) {
      const s = (p.status as string) || "active";
      statusMap[s] = (statusMap[s] || 0) + 1;
    }

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
