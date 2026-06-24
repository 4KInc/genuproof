import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";

// Shipping carrier webhook ingestion
// Accepts events from FedEx, DHL, UPS, etc. in a normalized format
// Each carrier would have a thin adapter that maps their webhook payload to this format

interface ShippingWebhook {
  // Required
  trackingNumber: string;
  carrier: string;
  status: "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "exception";

  // Product mapping — brand provides this when creating the shipment
  productId?: string;
  verificationCode?: string;

  // Carrier data
  location?: string;
  city?: string;
  country?: string;
  timestamp?: string;
  signedBy?: string;

  // Auth
  apiKey?: string;
}

// Map carrier statuses to GenuProof event types
const STATUS_MAP: Record<string, string> = {
  picked_up: "shipped",
  in_transit: "shipped",
  out_for_delivery: "shipped",
  delivered: "received",
  exception: "custom",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ShippingWebhook;
    const { trackingNumber, carrier, status, productId, verificationCode, location, city, country, timestamp, signedBy } = body;

    if (!trackingNumber || !carrier || !status) {
      return NextResponse.json(
        { error: "trackingNumber, carrier, and status are required" },
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
        { error: "productId or verificationCode required to map shipment to product" },
        { status: 400 }
      );
    }

    // Verify product exists
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
    const eventType = STATUS_MAP[status] || "custom";
    const locationStr = location || [city, country].filter(Boolean).join(", ") || null;

    const eventHash = hashEvent({
      productId: resolvedProductId,
      type: eventType,
      actor: carrier,
      timestamp: now,
      data: { trackingNumber, carrierStatus: status, signedBy, source: "shipping_webhook" },
      previousHash,
    });

    await putItem({
      PK: `PRODUCT#${resolvedProductId}`,
      SK: `EVENT#${now}#${eventType}`,
      productId: resolvedProductId,
      type: eventType,
      actor: `${carrier} (${trackingNumber})`,
      location: locationStr,
      timestamp: now,
      data: { trackingNumber, carrier, carrierStatus: status, signedBy, source: "shipping_webhook" },
      hash: eventHash,
      previousHash,
    });

    return NextResponse.json({
      success: true,
      eventType,
      hash: eventHash,
      productId: resolvedProductId,
      message: `Shipping event "${status}" from ${carrier} recorded for product`,
    });
  } catch (error) {
    console.error("Shipping ingest error:", error);
    return NextResponse.json({ error: "Failed to process shipping event" }, { status: 500 });
  }
}
