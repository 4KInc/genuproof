import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems, incrementCounter } from "@/lib/dynamodb";
import {
  generateProductId,
  generateVerificationCode,
  hashProductRecord,
  signData,
  hashEvent,
  sha256,
} from "@/lib/crypto";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "genuproof-dev-secret";

// Simulate a full product lifecycle with automated supply chain events
// Creates a product and plays out its entire journey over a realistic timeline

interface SimulationConfig {
  brandId: string;
  productName: string;
  sku?: string;
  category?: string;
  // The journey to simulate
  journey: "luxury_watch" | "fashion_handbag" | "pharmaceutical" | "electronics" | "custom";
  // Custom journey steps (only for journey: "custom")
  steps?: Array<{
    type: string;
    actor: string;
    location: string;
    delayHours?: number;
    carrier?: string;
    trackingNumber?: string;
    platform?: string;
    orderId?: string;
  }>;
}

// Pre-built journeys
const JOURNEYS: Record<
  string,
  Array<{ type: string; actor: string; location: string; carrier?: string; platform?: string; trackingNumber?: string; orderId?: string }>
> = {
  luxury_watch: [
    { type: "manufactured", actor: "Master Watchmaker", location: "Le Brassus, Switzerland" },
    { type: "inspected", actor: "COSC Certification", location: "Geneva, Switzerland" },
    { type: "shipped", actor: "Swiss Post International", location: "Geneva, Switzerland", carrier: "Swiss Post", trackingNumber: "CH-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "inspected", actor: "Customs Authority", location: "Frankfurt, Germany" },
    { type: "shipped", actor: "FedEx International", location: "Frankfurt, Germany", carrier: "FedEx", trackingNumber: "FX-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "US Distribution Center", location: "Memphis, TN" },
    { type: "inspected", actor: "Quality Assurance Team", location: "Memphis, TN" },
    { type: "shipped", actor: "FedEx Priority", location: "Memphis, TN", carrier: "FedEx", trackingNumber: "FX-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "Authorized Dealer", location: "New York, NY" },
    { type: "sold", actor: "Fifth Avenue Boutique", location: "New York, NY", platform: "shopify", orderId: "SHP-" + Date.now().toString().slice(-8) },
  ],
  fashion_handbag: [
    { type: "manufactured", actor: "Atelier Master Craftsman", location: "Florence, Italy" },
    { type: "inspected", actor: "Quality Control", location: "Florence, Italy" },
    { type: "shipped", actor: "DHL Express", location: "Florence, Italy", carrier: "DHL", trackingNumber: "DHL-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "inspected", actor: "EU Customs", location: "Paris, France" },
    { type: "received", actor: "European Distribution Hub", location: "Paris, France" },
    { type: "shipped", actor: "DHL International", location: "Paris, France", carrier: "DHL", trackingNumber: "DHL-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "Luxury Retailer Warehouse", location: "Los Angeles, CA" },
    { type: "shipped", actor: "Internal Logistics", location: "Los Angeles, CA" },
    { type: "received", actor: "Rodeo Drive Boutique", location: "Beverly Hills, CA" },
    { type: "sold", actor: "Rodeo Drive Boutique", location: "Beverly Hills, CA", platform: "square", orderId: "SQ-" + Date.now().toString().slice(-8) },
  ],
  pharmaceutical: [
    { type: "manufactured", actor: "Pharmaceutical Lab", location: "Basel, Switzerland" },
    { type: "inspected", actor: "FDA Quality Audit", location: "Basel, Switzerland" },
    { type: "inspected", actor: "Batch Testing Lab", location: "Basel, Switzerland" },
    { type: "shipped", actor: "Cold Chain Logistics", location: "Basel, Switzerland", carrier: "DHL Medical", trackingNumber: "MED-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "inspected", actor: "US FDA Import Inspection", location: "JFK Airport, NY" },
    { type: "received", actor: "Pharmaceutical Warehouse", location: "New Brunswick, NJ" },
    { type: "inspected", actor: "Temperature Verification", location: "New Brunswick, NJ" },
    { type: "shipped", actor: "McKesson Distribution", location: "New Brunswick, NJ", carrier: "McKesson", trackingNumber: "MCK-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "CVS Pharmacy #4421", location: "Manhattan, NY" },
    { type: "sold", actor: "CVS Pharmacy", location: "Manhattan, NY", platform: "woocommerce", orderId: "RX-" + Date.now().toString().slice(-8) },
  ],
  electronics: [
    { type: "manufactured", actor: "Assembly Line 7", location: "Shenzhen, China" },
    { type: "inspected", actor: "QC Station", location: "Shenzhen, China" },
    { type: "shipped", actor: "Maersk Shipping", location: "Shenzhen Port, China", carrier: "Maersk", trackingNumber: "MAEU-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "Port of Long Beach", location: "Long Beach, CA" },
    { type: "inspected", actor: "US Customs & Border Protection", location: "Long Beach, CA" },
    { type: "received", actor: "Amazon Fulfillment Center", location: "San Bernardino, CA" },
    { type: "shipped", actor: "Amazon Logistics", location: "San Bernardino, CA", carrier: "Amazon", trackingNumber: "TBA-" + Math.random().toString(36).slice(2, 10).toUpperCase() },
    { type: "received", actor: "Local Delivery Station", location: "San Francisco, CA" },
    { type: "sold", actor: "Amazon.com", location: "San Francisco, CA", platform: "stripe", orderId: "AMZ-" + Date.now().toString().slice(-8) },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SimulationConfig;
    const { brandId, productName, sku, category, journey } = body;

    if (!brandId || !productName || !journey) {
      return NextResponse.json(
        { error: "brandId, productName, and journey required" },
        { status: 400 }
      );
    }

    const brand = await getItem(`BRAND#${brandId}`, "PROFILE");
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const steps = journey === "custom" ? body.steps : JOURNEYS[journey];
    if (!steps || steps.length === 0) {
      return NextResponse.json({ error: "Invalid journey or no steps" }, { status: 400 });
    }

    // 1. Register the product
    const productId = generateProductId();
    const verificationCode = generateVerificationCode();
    const now = new Date().toISOString();

    const record = { productId, brandId, name: productName, sku, metadata: {}, createdAt: now };
    const hash = hashProductRecord(record);
    const signature = signData(hash, SIGNING_SECRET);

    const product = {
      PK: `PRODUCT#${productId}`,
      SK: "META",
      GSI1PK: `BRAND#${brandId}`,
      GSI1SK: `PRODUCT#${now}`,
      productId,
      brandId,
      brandName: brand.name as string,
      name: productName,
      sku: sku || null,
      category: category || null,
      verificationCode,
      hash,
      signature,
      status: "active",
      metadata: {},
      createdAt: now,
      updatedAt: now,
      scanCount: 0,
    };

    const codeLookup = {
      PK: `VERIFY#${verificationCode}`,
      SK: "META",
      GSI1PK: `VERIFY#${verificationCode}`,
      GSI1SK: "META",
      productId,
      brandId,
    };

    const productIndex = {
      PK: "PRODUCT_INDEX",
      SK: `PRODUCT#${now}#${productId}`,
      productId, brandId, name: productName,
      brandName: brand.name as string,
      sku: sku || null,
      category: category || null,
      description: null,
      status: "active",
      verificationCode,
      hash,
      createdAt: now,
      scanCount: 0,
    };

    await Promise.all([
      putItem(product),
      putItem(codeLookup),
      putItem(productIndex),
      incrementCounter(`BRAND#${brandId}`, "STATS", "productCount"),
    ]);

    // 2. Play out the journey — create hash-chained events
    let previousHash = sha256("");
    const events = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Spread events over simulated time (deterministic 90-min intervals to preserve sort order)
      const eventTime = new Date(
        new Date(now).getTime() + (i + 1) * 90 * 60 * 1000
      ).toISOString();

      const eventHash = hashEvent({
        productId,
        type: step.type,
        actor: step.actor,
        timestamp: eventTime,
        data: {
          source: step.type === "sold" ? "pos_webhook" : step.carrier ? "shipping_webhook" : "warehouse_webhook",
          ...(step.carrier && { carrier: step.carrier, trackingNumber: step.trackingNumber }),
          ...(step.platform && { platform: step.platform, orderId: step.orderId }),
          simulated: true,
        },
        previousHash,
      });

      await putItem({
        PK: `PRODUCT#${productId}`,
        SK: `EVENT#${eventTime}#${step.type}`,
        productId,
        type: step.type,
        actor: step.actor,
        location: step.location,
        timestamp: eventTime,
        data: {
          source: step.type === "sold" ? "pos_webhook" : step.carrier ? "shipping_webhook" : "warehouse_webhook",
          ...(step.carrier && { carrier: step.carrier, trackingNumber: step.trackingNumber }),
          ...(step.platform && { platform: step.platform, orderId: step.orderId }),
          simulated: true,
        },
        hash: eventHash,
        previousHash,
      });

      events.push({
        step: i + 1,
        type: step.type,
        actor: step.actor,
        location: step.location,
        hash: eventHash.slice(0, 16) + "...",
        source: step.carrier ? `${step.carrier} webhook` : step.platform ? `${step.platform} webhook` : "WMS webhook",
      });

      previousHash = eventHash;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://genuproof.com";

    return NextResponse.json({
      success: true,
      product: {
        productId,
        name: productName,
        verificationCode,
        hash: hash.slice(0, 16) + "...",
      },
      journey: {
        type: journey,
        totalSteps: events.length,
        events,
      },
      urls: {
        verify: `${baseUrl}/verify/${verificationCode}`,
        qr: `${baseUrl}/qr/${verificationCode}`,
        product: `${baseUrl}/product/${productId}`,
      },
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
