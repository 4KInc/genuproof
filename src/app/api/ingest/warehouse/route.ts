import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";

// Warehouse Management System (WMS) webhook ingestion
// Accepts events from warehouse scanning systems — receiving, inspection, dispatch

interface WarehouseWebhook {
  productId?: string;
  verificationCode?: string;

  action: "received" | "inspected" | "stored" | "dispatched" | "returned";
  warehouseName: string;
  warehouseLocation?: string;
  bay?: string; // Storage bay/shelf
  inspectorId?: string;
  notes?: string;
  timestamp?: string;
}

const ACTION_MAP: Record<string, string> = {
  received: "received",
  inspected: "inspected",
  stored: "received",
  dispatched: "shipped",
  returned: "received",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WarehouseWebhook;
    const { productId, verificationCode, action, warehouseName, warehouseLocation, bay, inspectorId, notes, timestamp } = body;

    if (!action || !warehouseName) {
      return NextResponse.json(
        { error: "action and warehouseName are required" },
        { status: 400 }
      );
    }

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

    const lastEvents = await queryItems(`PRODUCT#${resolvedProductId}`, "EVENT#", {
      limit: 1, scanForward: false,
    });
    const previousHash = lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

    const now = timestamp || new Date().toISOString();
    const eventType = ACTION_MAP[action] || "custom";

    const eventHash = hashEvent({
      productId: resolvedProductId,
      type: eventType,
      actor: warehouseName,
      timestamp: now,
      data: { action, bay, inspectorId, notes, source: "warehouse_webhook" },
      previousHash,
    });

    await putItem({
      PK: `PRODUCT#${resolvedProductId}`,
      SK: `EVENT#${now}#${eventType}`,
      productId: resolvedProductId,
      type: eventType,
      actor: warehouseName,
      location: warehouseLocation || null,
      timestamp: now,
      data: { action, bay, inspectorId, notes, source: "warehouse_webhook" },
      hash: eventHash,
      previousHash,
    });

    return NextResponse.json({
      success: true,
      eventType,
      hash: eventHash,
      productId: resolvedProductId,
      message: `Warehouse event "${action}" from ${warehouseName} recorded`,
    });
  } catch (error) {
    console.error("Warehouse ingest error:", error);
    return NextResponse.json({ error: "Failed to process warehouse event" }, { status: 500 });
  }
}
