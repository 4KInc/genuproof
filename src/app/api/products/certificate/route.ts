import { NextRequest, NextResponse } from "next/server";
import { getItem, queryItems } from "@/lib/dynamodb";
import { hashProductRecord, verifySignature } from "@/lib/crypto";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "genuproof-dev-secret";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const productId = req.nextUrl.searchParams.get("productId");

    let resolvedProductId = productId;

    if (code) {
      const codeLookup = await getItem(`VERIFY#${code}`, "META");
      if (!codeLookup) {
        return NextResponse.json({ error: "Code not found" }, { status: 404 });
      }
      resolvedProductId = codeLookup.productId as string;
    }

    if (!resolvedProductId) {
      return NextResponse.json({ error: "code or productId required" }, { status: 400 });
    }

    const product = await getItem(`PRODUCT#${resolvedProductId}`, "META");
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const events = await queryItems(`PRODUCT#${resolvedProductId}`, "EVENT#", { scanForward: true });

    // Verify integrity
    const recordHash = hashProductRecord({
      productId: product.productId as string,
      brandId: product.brandId as string,
      name: product.name as string,
      sku: product.sku as string | undefined,
      metadata: product.metadata as Record<string, unknown>,
      createdAt: product.createdAt as string,
    });

    const hashValid = recordHash === product.hash;
    const signatureValid = verifySignature(product.hash as string, product.signature as string, SIGNING_SECRET);

    let chainValid = true;
    for (let i = 1; i < events.length; i++) {
      if (events[i].previousHash !== events[i - 1].hash) {
        chainValid = false;
        break;
      }
    }

    const certificate = {
      version: "1.0",
      issuer: "GenuProof Platform",
      issuedAt: new Date().toISOString(),
      product: {
        id: product.productId,
        name: product.name,
        brand: product.brandName,
        sku: product.sku || null,
        category: product.category || null,
        registeredAt: product.createdAt,
        status: product.status,
      },
      cryptography: {
        algorithm: "SHA-256",
        signatureAlgorithm: "HMAC-SHA256",
        productHash: product.hash,
        signature: product.signature,
        hashValid,
        signatureValid,
      },
      provenance: {
        chainAlgorithm: "SHA-256-linked",
        chainValid,
        eventCount: events.length,
        events: events.map((e) => ({
          type: e.type,
          actor: e.actor,
          location: e.location || null,
          timestamp: e.timestamp,
          hash: e.hash,
          previousHash: e.previousHash,
        })),
      },
      verification: {
        authentic: hashValid && signatureValid && chainValid,
        verificationCode: product.verificationCode,
        verifyUrl: `https://genuproof.com/verify/${product.verificationCode}`,
        totalScans: product.scanCount || 0,
      },
    };

    return NextResponse.json(certificate, {
      headers: {
        "Content-Disposition": `attachment; filename="genuproof-certificate-${product.verificationCode}.json"`,
      },
    });
  } catch (error) {
    console.error("Certificate export error:", error);
    return NextResponse.json({ error: "Failed to export certificate" }, { status: 500 });
  }
}
