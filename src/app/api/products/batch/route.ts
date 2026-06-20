import { NextRequest, NextResponse } from "next/server";
import { putItem, getItem, incrementCounter } from "@/lib/dynamodb";
import {
  generateProductId,
  generateVerificationCode,
  hashProductRecord,
  signData,
  hashEvent,
  sha256,
} from "@/lib/crypto";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "authentik-dev-secret";

interface BatchProduct {
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  manufacturingLocation?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, products } = (await req.json()) as {
      brandId: string;
      products: BatchProduct[];
    };

    if (!brandId || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "brandId and products array are required" },
        { status: 400 }
      );
    }

    if (products.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 products per batch" },
        { status: 400 }
      );
    }

    const brand = await getItem(`BRAND#${brandId}`, "PROFILE");
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const results = [];

    for (const p of products) {
      if (!p.name) continue;

      const productId = generateProductId();
      const verificationCode = generateVerificationCode();
      const now = new Date().toISOString();

      const record = {
        productId,
        brandId,
        name: p.name,
        sku: p.sku,
        metadata: p.metadata,
        createdAt: now,
      };
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
        name: p.name,
        sku: p.sku || null,
        category: p.category || null,
        description: p.description || null,
        verificationCode,
        hash,
        signature,
        status: "active",
        metadata: p.metadata || {},
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

      const genesisHash = hashEvent({
        productId,
        type: "manufactured",
        actor: brandId,
        timestamp: now,
        previousHash: sha256(""),
      });

      const genesisEvent = {
        PK: `PRODUCT#${productId}`,
        SK: `EVENT#${now}#manufactured`,
        productId,
        type: "manufactured",
        actor: brand.name as string,
        location: p.manufacturingLocation || null,
        timestamp: now,
        data: { registeredBy: brandId, batch: true },
        hash: genesisHash,
        previousHash: sha256(""),
      };

      await Promise.all([
        putItem(product),
        putItem(codeLookup),
        putItem(genesisEvent),
        incrementCounter(`BRAND#${brandId}`, "STATS", "productCount"),
      ]);

      results.push({
        productId,
        name: p.name,
        verificationCode,
        hash,
      });
    }

    return NextResponse.json({
      registered: results.length,
      products: results,
    });
  } catch (error) {
    console.error("Batch registration error:", error);
    return NextResponse.json(
      { error: "Batch registration failed" },
      { status: 500 }
    );
  }
}
