import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem } from "@/lib/dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sha256 } from "@/lib/crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || "authentik";

// POST: Consumer claims ownership of a product after purchase
// Creates a fingerprint from device info and locks the product
export async function POST(req: NextRequest) {
  try {
    const { productId, consumerName, email } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const product = await getItem(`PRODUCT#${productId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if already claimed
    const existingClaim = await getItem(`PRODUCT#${productId}`, "CLAIM");
    if (existingClaim) {
      return NextResponse.json({
        error: "Product already claimed",
        claimed: true,
        claimedAt: existingClaim.claimedAt,
        // Don't reveal who claimed it
      }, { status: 409 });
    }

    // Build device fingerprint from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const fingerprint = sha256(`${ip}:${userAgent}`);

    const now = new Date().toISOString();

    // Write claim record
    const claim = {
      PK: `PRODUCT#${productId}`,
      SK: "CLAIM",
      productId,
      consumerName: consumerName || "Anonymous",
      email: email ? sha256(email) : null, // Store hash, not plaintext
      fingerprint,
      ip,
      claimedAt: now,
    };

    await putItem(claim);

    // Update product with claimed flag
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PRODUCT#${productId}`, SK: "META" },
        UpdateExpression: "SET claimed = :t, claimedAt = :now",
        ExpressionAttributeValues: { ":t": true, ":now": now },
      })
    );

    return NextResponse.json({
      success: true,
      claimedAt: now,
      message: "Product claimed. Future scans from other devices will show a warning.",
    });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: "Failed to claim product" }, { status: 500 });
  }
}

// GET: Check if a product is claimed
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const claim = await getItem(`PRODUCT#${productId}`, "CLAIM");
  if (!claim) {
    return NextResponse.json({ claimed: false });
  }

  return NextResponse.json({
    claimed: true,
    claimedAt: claim.claimedAt,
    consumerName: claim.consumerName,
  });
}
