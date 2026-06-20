import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  }),
});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function GET() {
  try {
    // Scan for all brand profiles (PK starts with BRAND# and SK = PROFILE)
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
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

    const brands = (result.Items || [])
      .map((b) => ({
        id: b.id,
        name: b.name,
        domain: b.domain,
        industry: b.industry,
        plan: b.plan,
        createdAt: b.createdAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime()
      );

    return NextResponse.json({ brands, count: brands.length });
  } catch (error) {
    console.error("Brands list error:", error);
    return NextResponse.json(
      { error: "Failed to list brands" },
      { status: 500 }
    );
  }
}
