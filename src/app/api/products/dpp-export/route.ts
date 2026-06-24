import { NextRequest, NextResponse } from "next/server";
import { getItem, queryItems } from "@/lib/dynamodb";

// EU Digital Product Passport (DPP) Export
// Returns product data in a format compatible with the EU DPP registry
// Based on GS1 Digital Link standards and ESPR regulation requirements

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    const code = req.nextUrl.searchParams.get("code");

    let resolvedProductId = productId;
    if (code) {
      const lookup = await getItem(`VERIFY#${code}`, "META");
      if (!lookup) return NextResponse.json({ error: "Code not found" }, { status: 404 });
      resolvedProductId = lookup.productId as string;
    }
    if (!resolvedProductId) {
      return NextResponse.json({ error: "productId or code required" }, { status: 400 });
    }

    const product = await getItem(`PRODUCT#${resolvedProductId}`, "META");
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const events = await queryItems(`PRODUCT#${resolvedProductId}`, "EVENT#", { scanForward: true });

    // Build DPP-compatible export
    const dpp = {
      "@context": "https://schema.org/",
      "@type": "Product",
      dppVersion: "1.0",
      dppStandard: "ESPR-2024/1781",

      // Product identification
      identification: {
        gtin: product.sku || null, // Would be real GTIN in production
        serialNumber: product.productId,
        verificationCode: product.verificationCode,
        batchId: null,
      },

      // Product information
      product: {
        name: product.name,
        brand: product.brandName,
        category: product.category || null,
        description: product.description || null,
        manufacturingDate: product.createdAt,
        status: product.status,
      },

      // Manufacturer information
      manufacturer: {
        name: product.brandName,
        brandId: product.brandId,
        registeredAt: product.createdAt,
      },

      // Supply chain traceability (ESPR Article 9)
      supplyChain: {
        eventCount: events.length,
        chainIntegrity: verifyChain(events),
        events: events.map((e, i) => ({
          sequence: i + 1,
          type: e.type,
          actor: e.actor,
          location: e.location || null,
          timestamp: e.timestamp,
          hash: e.hash,
          previousHash: e.previousHash,
          source: (e.data as Record<string, unknown>)?.source || "manual",
        })),
      },

      // Cryptographic verification
      verification: {
        algorithm: "SHA-256",
        signatureAlgorithm: "HMAC-SHA256",
        productHash: product.hash,
        signature: product.signature,
        verifyUrl: `https://genuproof.com/verify/${product.verificationCode}`,
        qrUrl: `https://genuproof.com/api/products/qr?code=${product.verificationCode}`,
      },

      // Sustainability (placeholder — would be populated by brand)
      sustainability: {
        carbonFootprint: null,
        recyclability: null,
        materials: null,
        certifications: [],
        repairInstructions: null,
      },

      // DPP metadata
      metadata: {
        issuer: "GenuProof Platform",
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        dataCarrier: "QR Code (ISO/IEC 18004)",
        accessLevel: "public",
      },
    };

    return NextResponse.json(dpp, {
      headers: {
        "Content-Disposition": `attachment; filename="dpp-${product.verificationCode}.json"`,
      },
    });
  } catch (error) {
    console.error("DPP export error:", error);
    return NextResponse.json({ error: "DPP export failed" }, { status: 500 });
  }
}

function verifyChain(events: Record<string, unknown>[]): boolean {
  for (let i = 1; i < events.length; i++) {
    if (events[i].previousHash !== events[i - 1].hash) return false;
  }
  return true;
}
