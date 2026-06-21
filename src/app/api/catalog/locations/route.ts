import { NextRequest, NextResponse } from "next/server";

// Location catalog — used by shipping carriers, warehouses, and POS systems
// to reference standard locations in provenance events

const LOCATIONS = {
  manufacturing: [
    { city: "Geneva", country: "Switzerland", region: "europe", specialties: ["watches", "jewelry"] },
    { city: "Le Brassus", country: "Switzerland", region: "europe", specialties: ["watches"] },
    { city: "Le Locle", country: "Switzerland", region: "europe", specialties: ["watches"] },
    { city: "La Chaux-de-Fonds", country: "Switzerland", region: "europe", specialties: ["watches"] },
    { city: "Florence", country: "Italy", region: "europe", specialties: ["handbags", "jewelry", "clothing"] },
    { city: "Valenza", country: "Italy", region: "europe", specialties: ["jewelry"] },
    { city: "Belluno", country: "Italy", region: "europe", specialties: ["eyewear"] },
    { city: "Milan", country: "Italy", region: "europe", specialties: ["clothing", "handbags"] },
    { city: "Paris", country: "France", region: "europe", specialties: ["fragrances", "clothing"] },
    { city: "Grasse", country: "France", region: "europe", specialties: ["fragrances"] },
    { city: "Ubrique", country: "Spain", region: "europe", specialties: ["handbags"] },
    { city: "London", country: "United Kingdom", region: "europe", specialties: ["clothing"] },
    { city: "Munich", country: "Germany", region: "europe", specialties: ["automotive", "electronics"] },
    { city: "Basel", country: "Switzerland", region: "europe", specialties: ["pharmaceuticals"] },
    { city: "Shenzhen", country: "China", region: "asia", specialties: ["electronics"] },
    { city: "Tokyo", country: "Japan", region: "asia", specialties: ["electronics", "watches"] },
  ],
  distribution: [
    { city: "Memphis", state: "TN", country: "United States", region: "americas", hub: "FedEx World Hub" },
    { city: "Newark", state: "NJ", country: "United States", region: "americas", hub: "East Coast Distribution" },
    { city: "Los Angeles", state: "CA", country: "United States", region: "americas", hub: "West Coast Distribution" },
    { city: "Long Beach", state: "CA", country: "United States", region: "americas", hub: "Port of Long Beach" },
    { city: "Frankfurt", country: "Germany", region: "europe", hub: "EU Customs Hub" },
    { city: "Paris", country: "France", region: "europe", hub: "European Distribution" },
    { city: "Dubai", country: "UAE", region: "middle_east", hub: "Middle East Distribution" },
    { city: "Singapore", country: "Singapore", region: "asia", hub: "Asia-Pacific Distribution" },
    { city: "Hong Kong", country: "China", region: "asia", hub: "Greater China Distribution" },
  ],
  retail: [
    { city: "New York", state: "NY", country: "United States", region: "americas", district: "Fifth Avenue" },
    { city: "Beverly Hills", state: "CA", country: "United States", region: "americas", district: "Rodeo Drive" },
    { city: "San Francisco", state: "CA", country: "United States", region: "americas", district: "Union Square" },
    { city: "Miami", state: "FL", country: "United States", region: "americas", district: "Design District" },
    { city: "Chicago", state: "IL", country: "United States", region: "americas", district: "Magnificent Mile" },
    { city: "London", country: "United Kingdom", region: "europe", district: "Bond Street" },
    { city: "Paris", country: "France", region: "europe", district: "Rue du Faubourg Saint-Honoré" },
    { city: "Milan", country: "Italy", region: "europe", district: "Via Montenapoleone" },
    { city: "Tokyo", country: "Japan", region: "asia", district: "Ginza" },
    { city: "Dubai", country: "UAE", region: "middle_east", district: "Dubai Mall" },
    { city: "Singapore", country: "Singapore", region: "asia", district: "Orchard Road" },
    { city: "Hong Kong", country: "China", region: "asia", district: "Canton Road" },
  ],
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // manufacturing, distribution, retail, or all
  const region = req.nextUrl.searchParams.get("region"); // europe, americas, asia, middle_east

  if (type && type !== "all" && LOCATIONS[type as keyof typeof LOCATIONS]) {
    const locs = LOCATIONS[type as keyof typeof LOCATIONS];
    const filtered = region ? locs.filter((l) => l.region === region) : locs;
    return NextResponse.json({ type, locations: filtered, count: filtered.length });
  }

  // Return all
  const all = {
    manufacturing: region ? LOCATIONS.manufacturing.filter((l) => l.region === region) : LOCATIONS.manufacturing,
    distribution: region ? LOCATIONS.distribution.filter((l) => l.region === region) : LOCATIONS.distribution,
    retail: region ? LOCATIONS.retail.filter((l) => l.region === region) : LOCATIONS.retail,
  };

  return NextResponse.json({
    locations: all,
    count: {
      manufacturing: all.manufacturing.length,
      distribution: all.distribution.length,
      retail: all.retail.length,
      total: all.manufacturing.length + all.distribution.length + all.retail.length,
    },
  });
}
