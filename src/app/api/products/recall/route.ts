import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems, incrementCounter } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function POST(req: NextRequest) {
  try {
    const { productId, reason, issuedBy } = await req.json();

    if (!productId || !reason) {
      return NextResponse.json(
        { error: "productId and reason are required" },
        { status: 400 }
      );
    }

    const product = await getItem(`PRODUCT#${productId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.status === "recalled") {
      return NextResponse.json({ error: "Product already recalled" }, { status: 400 });
    }

    // Get last event for chain
    const lastEvents = await queryItems(`PRODUCT#${productId}`, "EVENT#", {
      limit: 1, scanForward: false,
    });
    const previousHash = lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

    const now = new Date().toISOString();
    const eventHash = hashEvent({
      productId,
      type: "recalled",
      actor: issuedBy || "System",
      timestamp: now,
      data: { reason },
      previousHash,
    });

    // Write recall event
    await putItem({
      PK: `PRODUCT#${productId}`,
      SK: `EVENT#${now}#recalled`,
      productId,
      type: "recalled",
      actor: issuedBy || "System",
      timestamp: now,
      data: { reason },
      hash: eventHash,
      previousHash,
    });

    // Update product status
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PRODUCT#${productId}`, SK: "META" },
      UpdateExpression: "SET #s = :s, updatedAt = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "recalled", ":now": now },
    }));

    // Create threat alert
    const brandId = product.brandId as string;
    await putItem({
      PK: `THREAT#${brandId}`,
      SK: `ALERT#${now}`,
      GSI1PK: `BRAND#${brandId}`,
      GSI1SK: `THREAT#${now}`,
      brandId,
      type: "product_recall",
      severity: "critical",
      productId,
      details: `Product "${product.name}" recalled: ${reason}`,
      timestamp: now,
      resolved: false,
    });

    await incrementCounter(`BRAND#${brandId}`, "STATS", "threatCount");

    return NextResponse.json({
      success: true,
      hash: eventHash,
      timestamp: now,
      status: "recalled",
    });
  } catch (error) {
    console.error("Recall error:", error);
    return NextResponse.json({ error: "Recall failed" }, { status: 500 });
  }
}
