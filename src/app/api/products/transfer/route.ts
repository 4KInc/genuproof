import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

export async function POST(req: NextRequest) {
  try {
    const { productId, newOwner, location, reason } = await req.json();

    if (!productId || !newOwner) {
      return NextResponse.json(
        { error: "productId and newOwner are required" },
        { status: 400 }
      );
    }

    const product = await getItem(`PRODUCT#${productId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.status === "recalled") {
      return NextResponse.json(
        { error: "Cannot transfer a recalled product" },
        { status: 400 }
      );
    }

    // Get last event for chain
    const lastEvents = await queryItems(`PRODUCT#${productId}`, "EVENT#", {
      limit: 1,
      scanForward: false,
    });
    const previousHash = lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

    const now = new Date().toISOString();
    const eventHash = hashEvent({
      productId,
      type: "transferred",
      actor: newOwner,
      timestamp: now,
      data: { reason: reason || "ownership_transfer", previousOwner: product.brandName },
      previousHash,
    });

    // Write transfer event
    await putItem({
      PK: `PRODUCT#${productId}`,
      SK: `EVENT#${now}#transferred`,
      productId,
      type: "transferred",
      actor: newOwner,
      location: location || null,
      timestamp: now,
      data: { reason: reason || "ownership_transfer", previousOwner: product.brandName },
      hash: eventHash,
      previousHash,
    });

    // Update product status
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PRODUCT#${productId}`, SK: "META" },
        UpdateExpression: "SET #s = :s, updatedAt = :now",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": "transferred", ":now": now },
      })
    );

    return NextResponse.json({
      success: true,
      hash: eventHash,
      previousHash,
      timestamp: now,
      newOwner,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
