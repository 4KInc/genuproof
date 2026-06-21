import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";

// Point-of-Sale webhook ingestion
// Accepts events from Shopify, Square, WooCommerce, Stripe, etc.
// Fires when a product is sold to a consumer

interface POSWebhook {
  // Product mapping
  productId?: string;
  verificationCode?: string;
  sku?: string;

  // Sale data
  orderId: string;
  platform: string; // "shopify" | "square" | "woocommerce" | "stripe" | "manual"
  storeName?: string;
  storeLocation?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string; // Hashed before storage

  timestamp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as POSWebhook;
    const { productId, verificationCode, orderId, platform, storeName, storeLocation, amount, currency, timestamp } = body;

    if (!orderId || !platform) {
      return NextResponse.json(
        { error: "orderId and platform are required" },
        { status: 400 }
      );
    }

    // Resolve product ID
    let resolvedProductId = productId;
    if (!resolvedProductId && verificationCode) {
      const lookup = await getItem(`VERIFY#${verificationCode}`, "META");
      if (lookup) resolvedProductId = lookup.productId as string;
    }

    if (!resolvedProductId) {
      return NextResponse.json(
        { error: "productId or verificationCode required" },
        { status: 400 }
      );
    }

    const product = await getItem(`PRODUCT#${resolvedProductId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get last event for chain
    const lastEvents = await queryItems(`PRODUCT#${resolvedProductId}`, "EVENT#", {
      limit: 1, scanForward: false,
    });
    const previousHash = lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

    const now = timestamp || new Date().toISOString();
    const actor = storeName || `${platform} Store`;

    const eventHash = hashEvent({
      productId: resolvedProductId,
      type: "sold",
      actor,
      timestamp: now,
      data: { orderId, platform, amount, currency, source: "pos_webhook" },
      previousHash,
    });

    await putItem({
      PK: `PRODUCT#${resolvedProductId}`,
      SK: `EVENT#${now}#sold`,
      productId: resolvedProductId,
      type: "sold",
      actor,
      location: storeLocation || null,
      timestamp: now,
      data: { orderId, platform, amount, currency, source: "pos_webhook" },
      hash: eventHash,
      previousHash,
    });

    return NextResponse.json({
      success: true,
      eventType: "sold",
      hash: eventHash,
      productId: resolvedProductId,
      message: `Sale event from ${platform} (order ${orderId}) recorded`,
    });
  } catch (error) {
    console.error("POS ingest error:", error);
    return NextResponse.json({ error: "Failed to process sale event" }, { status: 500 });
  }
}
