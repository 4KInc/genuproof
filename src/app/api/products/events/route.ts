import { NextRequest, NextResponse } from "next/server";
import { putItem, queryItems, getItem } from "@/lib/dynamodb";
import { hashEvent } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, type, actor, location, coordinates, data } = body;

    if (!productId || !type || !actor) {
      return NextResponse.json(
        { error: "productId, type, and actor are required" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await getItem(`PRODUCT#${productId}`, "META");
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get the last event to chain hashes
    const lastEvents = await queryItems(
      `PRODUCT#${productId}`,
      "EVENT#",
      { limit: 1, scanForward: false }
    );

    const previousHash =
      lastEvents.length > 0 ? (lastEvents[0].hash as string) : "";

    const now = new Date().toISOString();
    const eventHash = hashEvent({
      productId,
      type,
      actor,
      timestamp: now,
      data,
      previousHash,
    });

    const event = {
      PK: `PRODUCT#${productId}`,
      SK: `EVENT#${now}#${type}`,
      productId,
      type,
      actor,
      location: location || null,
      coordinates: coordinates || null,
      timestamp: now,
      data: data || {},
      hash: eventHash,
      previousHash,
    };

    await putItem(event);

    return NextResponse.json({
      hash: eventHash,
      previousHash,
      timestamp: now,
      type,
    });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 }
    );
  }

  const events = await queryItems(`PRODUCT#${productId}`, "EVENT#", {
    scanForward: true,
  });

  return NextResponse.json({
    events: events.map((e) => ({
      type: e.type,
      actor: e.actor,
      location: e.location,
      timestamp: e.timestamp,
      data: e.data,
      hash: e.hash,
      previousHash: e.previousHash,
    })),
    count: events.length,
    chainValid: verifyChain(events),
  });
}

function verifyChain(events: Record<string, unknown>[]): boolean {
  for (let i = 1; i < events.length; i++) {
    if (events[i].previousHash !== events[i - 1].hash) return false;
  }
  return true;
}
