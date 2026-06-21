import { NextRequest, NextResponse } from "next/server";
import { putItem, queryItems } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";

// Bulk provenance: add the same event to multiple products
export async function POST(req: NextRequest) {
  try {
    const { productIds, type, actor, location } = await req.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "productIds array required" }, { status: 400 });
    }
    if (!type || !actor) {
      return NextResponse.json({ error: "type and actor required" }, { status: 400 });
    }
    if (productIds.length > 50) {
      return NextResponse.json({ error: "Maximum 50 products per batch" }, { status: 400 });
    }

    const results = [];

    for (const productId of productIds) {
      const lastEvents = await queryItems(`PRODUCT#${productId}`, "EVENT#", {
        limit: 1,
        scanForward: false,
      });
      const previousHash = lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

      const now = new Date().toISOString();
      const eventHash = hashEvent({
        productId,
        type,
        actor,
        timestamp: now,
        data: { bulk: true },
        previousHash,
      });

      await putItem({
        PK: `PRODUCT#${productId}`,
        SK: `EVENT#${now}#${type}`,
        productId,
        type,
        actor,
        location: location || null,
        timestamp: now,
        data: { bulk: true },
        hash: eventHash,
        previousHash,
      });

      results.push({ productId, hash: eventHash });
    }

    return NextResponse.json({
      processed: results.length,
      events: results,
    });
  } catch (error) {
    console.error("Bulk event error:", error);
    return NextResponse.json({ error: "Bulk event failed" }, { status: 500 });
  }
}
