import { NextRequest, NextResponse } from "next/server";
import { putItem, getItem, incrementCounter, queryGSI1 } from "@/lib/dynamodb";
import {
  generateProductId,
  generateVerificationCode,
  hashProductRecord,
  signData,
  hashEvent,
  sha256,
} from "@/lib/crypto";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "genuproof-dev-secret";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, name, sku, category, description, imageUrl, metadata } =
      body;

    if (!brandId || !name) {
      return NextResponse.json(
        { error: "brandId and name are required" },
        { status: 400 }
      );
    }

    // Verify brand exists
    const brand = await getItem(`BRAND#${brandId}`, "PROFILE");
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Deduplication: check if a product with the same name (and SKU if provided) already exists for this brand
    const existingProducts = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", { limit: 200 });
    const duplicate = existingProducts.find((p) => {
      if (p.name !== name) return false;
      // If SKU is provided, both must match; if not, name match alone is a duplicate
      if (sku && p.sku) return p.sku === sku;
      return true;
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Product "${name}"${sku ? ` (SKU: ${sku})` : ""} already exists for this brand` },
        { status: 409 }
      );
    }

    const productId = generateProductId();
    const verificationCode = generateVerificationCode();
    const now = new Date().toISOString();

    const record = { productId, brandId, name, sku, metadata, createdAt: now };
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
      name,
      sku: sku || null,
      category: category || null,
      description: description || null,
      imageUrl: imageUrl || null,
      verificationCode,
      hash,
      signature,
      status: "active",
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      scanCount: 0,
    };

    // Verification code lookup (GSI1)
    const codeLookup = {
      PK: `VERIFY#${verificationCode}`,
      SK: "META",
      GSI1PK: `VERIFY#${verificationCode}`,
      GSI1SK: "META",
      productId,
      brandId,
    };

    // Hash lookup for tamper detection
    const hashLookup = {
      PK: `HASH#${hash}`,
      SK: "META",
      productId,
      brandId,
    };

    // Genesis provenance event
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
      location: (body.manufacturingLocation as string) || null,
      timestamp: now,
      data: { registeredBy: brandId },
      hash: genesisHash,
      previousHash: sha256(""),
    };

    // PRODUCT_INDEX entry enables Query-based explore/analytics (no Scan)
    const productIndex = {
      PK: "PRODUCT_INDEX",
      SK: `PRODUCT#${now}#${productId}`,
      productId, brandId, name,
      brandName: brand.name as string,
      sku: sku || null,
      category: category || null,
      description: description || null,
      status: "active",
      verificationCode,
      hash,
      createdAt: now,
      scanCount: 0,
    };

    // Write all items
    await Promise.all([
      putItem(product),
      putItem(codeLookup),
      putItem(hashLookup),
      putItem(genesisEvent),
      putItem(productIndex),
      incrementCounter(`BRAND#${brandId}`, "STATS", "productCount"),
    ]);

    return NextResponse.json({
      productId,
      verificationCode,
      hash,
      signature,
      verifyUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ""}/verify/${verificationCode}`,
      qrData: JSON.stringify({
        v: 1,
        code: verificationCode,
        pid: productId,
      }),
    });
  } catch (error) {
    console.error("Product registration error:", error);
    return NextResponse.json(
      { error: "Failed to register product" },
      { status: 500 }
    );
  }
}
