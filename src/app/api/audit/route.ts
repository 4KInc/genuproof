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
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30");

    // Scan for recent events across all products
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "begins_with(SK, :eventPrefix) OR begins_with(SK, :scanPrefix) OR begins_with(SK, :alertPrefix)",
        ExpressionAttributeValues: {
          ":eventPrefix": "EVENT#",
          ":scanPrefix": "SCAN#",
          ":alertPrefix": "ALERT#",
        },
        Limit: limit * 5,
      })
    );

    const items = (result.Items || [])
      .map((item) => {
        const sk = item.SK as string;
        if (sk.startsWith("EVENT#")) {
          return {
            type: "event" as const,
            action: item.type as string,
            actor: item.actor as string,
            productId: item.productId as string,
            location: item.location as string | null,
            timestamp: item.timestamp as string,
            hash: (item.hash as string)?.slice(0, 12),
          };
        } else if (sk.startsWith("SCAN#")) {
          return {
            type: "scan" as const,
            action: "verification_scan",
            actor: null,
            productId: item.productId as string,
            location: `${item.city}, ${item.country}`,
            timestamp: item.timestamp as string,
            hash: null,
            result: item.result as string,
          };
        } else {
          return {
            type: "alert" as const,
            action: item.type as string,
            actor: null,
            productId: item.productId as string | null,
            location: null,
            timestamp: item.timestamp as string,
            hash: null,
            severity: item.severity as string,
            details: item.details as string,
          };
        }
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({ entries: items, count: items.length });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
