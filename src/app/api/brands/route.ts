import { NextRequest, NextResponse } from "next/server";
import { putItem, getItem } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, domain, industry, logoUrl } = body;

    if (!name || !domain || !industry) {
      return NextResponse.json(
        { error: "name, domain, and industry are required" },
        { status: 400 }
      );
    }

    const brandId = uuidv4();
    const now = new Date().toISOString();

    const brand = {
      PK: `BRAND#${brandId}`,
      SK: "PROFILE",
      GSI1PK: `BRAND#${brandId}`,
      GSI1SK: `PROFILE`,
      id: brandId,
      name,
      domain,
      industry,
      logoUrl: logoUrl || null,
      plan: "free",
      createdAt: now,
      productCount: 0,
      scanCount: 0,
    };

    const stats = {
      PK: `BRAND#${brandId}`,
      SK: "STATS",
      productCount: 0,
      scanCount: 0,
      threatCount: 0,
    };

    await Promise.all([putItem(brand), putItem(stats)]);

    return NextResponse.json({
      id: brandId,
      name,
      domain,
      industry,
      plan: "free",
      createdAt: now,
    });
  } catch (error) {
    console.error("Brand creation error:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("id");
  if (!brandId) {
    return NextResponse.json(
      { error: "Brand ID is required" },
      { status: 400 }
    );
  }

  const brand = await getItem(`BRAND#${brandId}`, "PROFILE");
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const stats = await getItem(`BRAND#${brandId}`, "STATS");

  return NextResponse.json({
    ...brand,
    productCount: (stats?.productCount as number) || 0,
    scanCount: (stats?.scanCount as number) || 0,
    threatCount: (stats?.threatCount as number) || 0,
  });
}
