import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems, incrementCounter } from "@/lib/dynamodb";
import { sha256 } from "@/lib/crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

// POST: Consumer disputes an existing claim — "I'm the real buyer"
export async function POST(req: NextRequest) {
  try {
    const { productId, consumerName, email, orderNumber, notes } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const product = await getItem(`PRODUCT#${productId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existingClaim = await getItem(`PRODUCT#${productId}`, "CLAIM");
    if (!existingClaim) {
      return NextResponse.json({ error: "No existing claim to dispute" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const fingerprint = sha256(`${ip}:${userAgent}`);
    const now = new Date().toISOString();

    // Write dispute record
    const dispute = {
      PK: `PRODUCT#${productId}`,
      SK: `DISPUTE#${now}`,
      productId,
      consumerName: consumerName || "Anonymous",
      email: email ? sha256(email) : null,
      orderNumber: orderNumber || null,
      notes: notes || null,
      fingerprint,
      ip,
      status: "open", // open → investigating → resolved_original → resolved_disputant
      createdAt: now,
      originalClaim: {
        claimedAt: existingClaim.claimedAt,
        claimedBy: existingClaim.consumerName,
      },
    };

    await putItem(dispute);

    // Mark the claim as disputed
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PRODUCT#${productId}`, SK: "CLAIM" },
        UpdateExpression: "SET disputed = :t, disputedAt = :now, disputeCount = if_not_exists(disputeCount, :zero) + :one",
        ExpressionAttributeValues: { ":t": true, ":now": now, ":zero": 0, ":one": 1 },
      })
    );

    // Create CRITICAL threat alert for the brand
    const brandId = product.brandId as string;
    await putItem({
      PK: `THREAT#${brandId}`,
      SK: `ALERT#${now}`,
      GSI1PK: `BRAND#${brandId}`,
      GSI1SK: `THREAT#${now}`,
      brandId,
      type: "ownership_dispute",
      severity: "critical",
      productId,
      details: `Ownership dispute on "${product.name}". Original claim: ${existingClaim.consumerName} (${existingClaim.claimedAt}). Disputant: ${consumerName || "Anonymous"}${orderNumber ? `. Order: ${orderNumber}` : ""}. One of these is likely a counterfeit with a cloned tag.`,
      timestamp: now,
      resolved: false,
    });

    await incrementCounter(`BRAND#${brandId}`, "STATS", "threatCount");

    return NextResponse.json({
      success: true,
      disputeId: now,
      status: "open",
      message: "Dispute submitted. The brand has been notified and will investigate. You may be contacted to verify your purchase.",
    });
  } catch (error) {
    console.error("Dispute error:", error);
    return NextResponse.json({ error: "Failed to submit dispute" }, { status: 500 });
  }
}

// GET: List disputes for a product
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const disputes = await queryItems(`PRODUCT#${productId}`, "DISPUTE#", {
    scanForward: false,
    limit: 20,
  });

  return NextResponse.json({
    disputes: disputes.map((d) => ({
      consumerName: d.consumerName,
      orderNumber: d.orderNumber,
      status: d.status,
      createdAt: d.createdAt,
      originalClaim: d.originalClaim,
      notes: d.notes,
    })),
    count: disputes.length,
  });
}
