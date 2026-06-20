import { NextRequest, NextResponse } from "next/server";
import { getItem, queryGSI1 } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const productId = req.nextUrl.searchParams.get("productId");
    const brandId = req.nextUrl.searchParams.get("brandId");

    // Search by verification code
    if (code) {
      const codeLookup = await getItem(`VERIFY#${code}`, "META");
      if (!codeLookup) {
        return NextResponse.json({ found: false, error: "Code not found" }, { status: 404 });
      }
      const product = await getItem(`PRODUCT#${codeLookup.productId}`, "META");
      if (!product) {
        return NextResponse.json({ found: false, error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({
        found: true,
        product: {
          productId: product.productId,
          name: product.name,
          brandName: product.brandName,
          sku: product.sku,
          category: product.category,
          status: product.status,
          verificationCode: product.verificationCode,
          hash: product.hash,
          createdAt: product.createdAt,
          scanCount: product.scanCount || 0,
        },
      });
    }

    // Search by product ID
    if (productId) {
      const product = await getItem(`PRODUCT#${productId}`, "META");
      if (!product) {
        return NextResponse.json({ found: false, error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({
        found: true,
        product: {
          productId: product.productId,
          name: product.name,
          brandName: product.brandName,
          sku: product.sku,
          category: product.category,
          status: product.status,
          verificationCode: product.verificationCode,
          hash: product.hash,
          createdAt: product.createdAt,
          scanCount: product.scanCount || 0,
        },
      });
    }

    // List by brand
    if (brandId) {
      const products = await queryGSI1(`BRAND#${brandId}`, "PRODUCT#", {
        limit: 100, scanForward: false,
      });
      return NextResponse.json({
        found: true,
        count: products.length,
        products: products.map((p) => ({
          productId: p.productId,
          name: p.name,
          sku: p.sku,
          category: p.category,
          status: p.status,
          verificationCode: p.verificationCode,
          createdAt: p.createdAt,
          scanCount: p.scanCount || 0,
        })),
      });
    }

    return NextResponse.json(
      { error: "Provide code, productId, or brandId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
