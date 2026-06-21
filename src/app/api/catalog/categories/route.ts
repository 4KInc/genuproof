import { NextResponse } from "next/server";

// Product category catalog — used by POS systems and brand portals
// to ensure consistent categorization across the supply chain

const CATEGORIES = [
  { id: "watches", label: "Watches", industries: ["fashion", "electronics"] },
  { id: "handbags", label: "Handbags", industries: ["fashion"] },
  { id: "jewelry", label: "Jewelry", industries: ["fashion"] },
  { id: "eyewear", label: "Eyewear", industries: ["fashion"] },
  { id: "fragrances", label: "Fragrances", industries: ["fashion", "cosmetics"] },
  { id: "footwear", label: "Footwear", industries: ["fashion"] },
  { id: "clothing", label: "Clothing", industries: ["fashion"] },
  { id: "electronics", label: "Electronics", industries: ["electronics"] },
  { id: "pharmaceuticals", label: "Pharmaceuticals", industries: ["pharmaceuticals"] },
  { id: "wine_spirits", label: "Wine & Spirits", industries: ["food"] },
  { id: "art", label: "Art", industries: ["other"] },
  { id: "automotive", label: "Automotive Parts", industries: ["automotive"] },
  { id: "cosmetics", label: "Cosmetics", industries: ["cosmetics"] },
  { id: "other", label: "Other", industries: ["other"] },
];

export async function GET() {
  return NextResponse.json({
    categories: CATEGORIES,
    count: CATEGORIES.length,
  });
}
