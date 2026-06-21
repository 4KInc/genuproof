import { NextRequest, NextResponse } from "next/server";

// Supply chain actor catalog — shipping carriers, warehouses, customs, retailers
// External systems use this to reference standardized actors in provenance events

const ACTORS = {
  carriers: [
    { id: "fedex_express", name: "FedEx Express", type: "air", regions: ["global"] },
    { id: "fedex_intl", name: "FedEx International Priority", type: "air", regions: ["global"] },
    { id: "fedex_ground", name: "FedEx Ground", type: "ground", regions: ["americas"] },
    { id: "dhl_express", name: "DHL Express", type: "air", regions: ["global"] },
    { id: "dhl_intl", name: "DHL International", type: "air", regions: ["global"] },
    { id: "dhl_medical", name: "DHL Medical Express", type: "cold_chain", regions: ["global"] },
    { id: "ups_worldwide", name: "UPS Worldwide", type: "air", regions: ["global"] },
    { id: "ups_ground", name: "UPS Ground", type: "ground", regions: ["americas"] },
    { id: "swiss_post", name: "Swiss Post International", type: "postal", regions: ["europe"] },
    { id: "chronopost", name: "Chronopost France", type: "express", regions: ["europe"] },
    { id: "maersk", name: "Maersk Shipping", type: "sea", regions: ["global"] },
    { id: "amazon_logistics", name: "Amazon Logistics", type: "last_mile", regions: ["americas", "europe"] },
    { id: "mckesson", name: "McKesson Distribution", type: "pharma", regions: ["americas"] },
  ],
  warehouses: [
    { id: "us_dist_east", name: "US Distribution Center (East)", location: "Newark, NJ" },
    { id: "us_dist_central", name: "US Distribution Center (Central)", location: "Memphis, TN" },
    { id: "us_dist_west", name: "US Distribution Center (West)", location: "Los Angeles, CA" },
    { id: "eu_dist", name: "European Distribution Hub", location: "Paris, France" },
    { id: "asia_dist", name: "Asia-Pacific Distribution", location: "Singapore" },
    { id: "me_dist", name: "Middle East Distribution", location: "Dubai, UAE" },
    { id: "pharma_warehouse", name: "Pharmaceutical Warehouse", location: "New Brunswick, NJ" },
    { id: "cold_storage", name: "Cold Chain Storage Facility", location: "Memphis, TN" },
  ],
  inspection: [
    { id: "qc_team", name: "Quality Control Team", scope: "general" },
    { id: "cosc", name: "COSC Certification Body", scope: "watches" },
    { id: "customs_eu", name: "EU Customs Authority", scope: "import" },
    { id: "customs_us", name: "US Customs & Border Protection", scope: "import" },
    { id: "fda", name: "FDA Import Inspection", scope: "pharmaceuticals" },
    { id: "temp_verify", name: "Temperature Verification", scope: "cold_chain" },
    { id: "qa_team", name: "Quality Assurance Team", scope: "general" },
    { id: "batch_testing", name: "Batch Testing Lab", scope: "pharmaceuticals" },
  ],
  retailers: [
    { id: "authorized_dealer", name: "Authorized Dealer", type: "general" },
    { id: "fifth_ave", name: "Fifth Avenue Boutique", location: "New York, NY" },
    { id: "rodeo_drive", name: "Rodeo Drive Boutique", location: "Beverly Hills, CA" },
    { id: "ginza", name: "Ginza Premium Store", location: "Tokyo, Japan" },
    { id: "dubai_mall", name: "Dubai Mall Flagship", location: "Dubai, UAE" },
    { id: "bond_street", name: "Bond Street Boutique", location: "London, UK" },
    { id: "online_store", name: "Online Store", type: "ecommerce" },
    { id: "cvs", name: "CVS Pharmacy", type: "pharmacy" },
  ],
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // carriers, warehouses, inspection, retailers, or all

  if (type && type !== "all" && ACTORS[type as keyof typeof ACTORS]) {
    return NextResponse.json({
      type,
      actors: ACTORS[type as keyof typeof ACTORS],
      count: ACTORS[type as keyof typeof ACTORS].length,
    });
  }

  return NextResponse.json({
    actors: ACTORS,
    count: {
      carriers: ACTORS.carriers.length,
      warehouses: ACTORS.warehouses.length,
      inspection: ACTORS.inspection.length,
      retailers: ACTORS.retailers.length,
      total: ACTORS.carriers.length + ACTORS.warehouses.length + ACTORS.inspection.length + ACTORS.retailers.length,
    },
  });
}
