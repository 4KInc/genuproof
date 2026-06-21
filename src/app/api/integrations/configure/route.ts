import { NextRequest, NextResponse } from "next/server";
import { putItem, queryItems, getItem } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { sha256 } from "@/lib/crypto";

// Brands configure integrations — connect their FedEx/Shopify/WMS accounts
// Each integration gets a unique ingest key for authenticating webhook calls

export async function POST(req: NextRequest) {
  try {
    const { brandId, type, config } = await req.json();

    if (!brandId || !type) {
      return NextResponse.json({ error: "brandId and type required" }, { status: 400 });
    }

    const validTypes = ["fedex", "dhl", "ups", "shopify", "square", "woocommerce", "stripe", "wms_custom"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const brand = await getItem(`BRAND#${brandId}`, "PROFILE");
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const integrationId = uuidv4();
    const ingestKey = `aik_${sha256(integrationId + Date.now()).slice(0, 32)}`;
    const now = new Date().toISOString();

    const integration = {
      PK: `BRAND#${brandId}`,
      SK: `INTEGRATION#${integrationId}`,
      id: integrationId,
      brandId,
      type,
      ingestKey,
      active: true,
      config: config || {},
      createdAt: now,
      lastEvent: null,
      eventCount: 0,
    };

    await putItem(integration);

    // Build the webhook URL for this integration
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://authentik-platform.vercel.app";
    const endpointMap: Record<string, string> = {
      fedex: "/api/ingest/shipping",
      dhl: "/api/ingest/shipping",
      ups: "/api/ingest/shipping",
      shopify: "/api/ingest/pos",
      square: "/api/ingest/pos",
      woocommerce: "/api/ingest/pos",
      stripe: "/api/ingest/pos",
      wms_custom: "/api/ingest/warehouse",
    };

    return NextResponse.json({
      id: integrationId,
      type,
      ingestKey,
      active: true,
      webhookUrl: `${baseUrl}${endpointMap[type]}`,
      instructions: getSetupInstructions(type, `${baseUrl}${endpointMap[type]}`, ingestKey),
    });
  } catch (error) {
    console.error("Integration config error:", error);
    return NextResponse.json({ error: "Failed to configure integration" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  const integrations = await queryItems(`BRAND#${brandId}`, "INTEGRATION#");

  return NextResponse.json({
    integrations: integrations.map((i) => ({
      id: i.id,
      type: i.type,
      active: i.active,
      ingestKey: `${(i.ingestKey as string).slice(0, 8)}...`,
      createdAt: i.createdAt,
      lastEvent: i.lastEvent,
      eventCount: i.eventCount,
    })),
    count: integrations.length,
  });
}

function getSetupInstructions(type: string, webhookUrl: string, ingestKey: string): Record<string, string> {
  const instructions: Record<string, Record<string, string>> = {
    fedex: {
      step1: "Log into FedEx Developer Portal → Webhooks → Create Webhook",
      step2: `Set webhook URL to: ${webhookUrl}`,
      step3: "Subscribe to events: PICKED_UP, IN_TRANSIT, DELIVERED",
      step4: `Add header X-Ingest-Key: ${ingestKey}`,
      step5: "Map your tracking numbers to Authentik product IDs in your shipping system",
    },
    dhl: {
      step1: "Log into DHL Developer Portal → Shipment Tracking → Webhooks",
      step2: `Set callback URL to: ${webhookUrl}`,
      step3: "Subscribe to: shipment.pickup, shipment.transit, shipment.delivered",
      step4: `Add header X-Ingest-Key: ${ingestKey}`,
      step5: "Include productId in the reference field of your DHL shipment",
    },
    ups: {
      step1: "Log into UPS Developer Kit → Tracking → Push Notifications",
      step2: `Set endpoint URL to: ${webhookUrl}`,
      step3: "Subscribe to: Pickup, In Transit, Delivered, Exception",
      step4: `Add header X-Ingest-Key: ${ingestKey}`,
      step5: "Map UPS tracking numbers to Authentik products in your OMS",
    },
    shopify: {
      step1: "Shopify Admin → Settings → Notifications → Webhooks → Create Webhook",
      step2: "Event: Order payment, Format: JSON",
      step3: `URL: ${webhookUrl}`,
      step4: "Map Shopify SKUs to Authentik verification codes in your product catalog",
      step5: "Authentik will auto-create 'sold' events for each order line item",
    },
    square: {
      step1: "Square Developer Dashboard → Webhooks → Add Webhook",
      step2: `URL: ${webhookUrl}`,
      step3: "Subscribe to: payment.completed",
      step4: `Add header X-Ingest-Key: ${ingestKey}`,
      step5: "Map Square catalog item IDs to Authentik product IDs",
    },
    woocommerce: {
      step1: "WooCommerce → Settings → Advanced → Webhooks → Add Webhook",
      step2: "Topic: Order updated, Status: Active",
      step3: `Delivery URL: ${webhookUrl}`,
      step4: `Secret: ${ingestKey}`,
      step5: "Use WooCommerce SKU field to store Authentik verification codes",
    },
    stripe: {
      step1: "Stripe Dashboard → Developers → Webhooks → Add Endpoint",
      step2: `Endpoint URL: ${webhookUrl}`,
      step3: "Events: checkout.session.completed, payment_intent.succeeded",
      step4: `Add metadata key 'authentik_key': '${ingestKey}'`,
      step5: "Include Authentik productId in Stripe metadata for each line item",
    },
    wms_custom: {
      step1: "Configure your WMS to send HTTP POST on scan events",
      step2: `Target URL: ${webhookUrl}`,
      step3: `Include header X-Ingest-Key: ${ingestKey}`,
      step4: "Send JSON body with: action, warehouseName, productId/verificationCode",
      step5: "Supported actions: received, inspected, stored, dispatched, returned",
    },
  };

  return instructions[type] || instructions.wms_custom;
}
