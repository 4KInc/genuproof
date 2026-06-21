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
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const status = req.nextUrl.searchParams.get("status") || "active";

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #s = :status",
        ExpressionAttributeValues: {
          ":prefix": "PRODUCT#",
          ":sk": "META",
          ":status": status,
        },
        ExpressionAttributeNames: { "#s": "status" },
        Limit: limit * 3, // overscan for filter
      })
    );

    const products = (result.Items || [])
      .slice(0, limit)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        brandName: p.brandName,
        sku: p.sku,
        category: p.category,
        description: p.description,
        status: p.status,
        verificationCode: p.verificationCode,
        hash: (p.hash as string).slice(0, 16) + "...",
        createdAt: p.createdAt,
        scanCount: p.scanCount || 0,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime()
      );

    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    console.error("Explore error:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
