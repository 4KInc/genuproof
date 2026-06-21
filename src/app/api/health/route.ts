import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function GET() {
  const start = Date.now();
  let dbStatus = "healthy";

  try {
    await ddb.send(
      new ScanCommand({ TableName: TABLE, Limit: 1, Select: "COUNT" })
    );
  } catch {
    dbStatus = "unhealthy";
  }

  const latency = Date.now() - start;

  return NextResponse.json({
    status: dbStatus === "healthy" ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      database: dbStatus,
      dbLatency: `${latency}ms`,
    },
    version: "1.0.0",
    endpoints: 15,
    pages: 11,
  });
}
