import { test, expect } from "@playwright/test";

const BRAND_ID = "5019622c-9860-4b83-a5c6-adb82ebd0412";
const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const PERFUME_CODE = "27dEHQymVRMl";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const SUNGLASSES_CODE = "IebJZgMHdD-h";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";

test.describe("Brands API", () => {
  test("GET /api/brands?id returns brand profile", async ({ request }) => {
    const res = await request.get(`/api/brands?id=${BRAND_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.name).toBeTruthy();
    expect(body.domain).toBeTruthy();
    expect(body.industry).toBeTruthy();
  });

  test("GET /api/brands/list returns brands array", async ({ request }) => {
    const res = await request.get("/api/brands/list");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.brands).toBeInstanceOf(Array);
    expect(body.count).toBeGreaterThan(0);
    expect(body.brands[0]).toHaveProperty("name");
  });

  test("GET /api/brands/stats returns stats with counters", async ({ request }) => {
    const res = await request.get(`/api/brands/stats?brandId=${BRAND_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(typeof body.productCount).toBe("number");
    expect(typeof body.totalScans).toBe("number");
    expect(typeof body.threatCount).toBe("number");
    expect(typeof body.activeProducts).toBe("number");
  });

  test("GET /api/brands?id with invalid ID returns 404", async ({ request }) => {
    const res = await request.get("/api/brands?id=nonexistent-brand-id");
    expect(res.status()).toBe(404);
  });

  test("GET /api/brands without id returns 400", async ({ request }) => {
    const res = await request.get("/api/brands");
    expect(res.status()).toBe(400);
  });
});

test.describe("Products API", () => {
  test("GET /api/products/list returns products for brand", async ({ request }) => {
    const res = await request.get(`/api/products/list?brandId=${BRAND_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.products).toBeInstanceOf(Array);
    expect(body.count).toBeGreaterThan(0);
    expect(body.products[0]).toHaveProperty("productId");
    expect(body.products[0]).toHaveProperty("verificationCode");
  });

  test("GET /api/products/search finds product by code", async ({ request }) => {
    const res = await request.get(`/api/products/search?code=${WATCH_CODE}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.product.verificationCode).toBe(WATCH_CODE);
  });

  test("GET /api/products/search returns not found for invalid code", async ({ request }) => {
    const res = await request.get("/api/products/search?code=FAKE_CODE_XYZ");
    const body = await res.json();
    expect(body.found).toBe(false);
  });

  test("GET /api/products/events returns provenance chain with integrity check", async ({ request }) => {
    const res = await request.get(`/api/products/events?productId=${WATCH_PRODUCT_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.events).toBeInstanceOf(Array);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.chainValid).toBe(true);
    expect(body.events[0]).toHaveProperty("hash");
    expect(body.events[0]).toHaveProperty("previousHash");
    expect(body.events[0]).toHaveProperty("type");
    expect(body.events[0]).toHaveProperty("actor");
  });

  test("GET /api/products/certificate returns full cryptographic certificate", async ({ request }) => {
    const res = await request.get(`/api/products/certificate?code=${WATCH_CODE}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.version).toBe("1.0");
    expect(body.issuer).toBeTruthy();
    expect(body.product).toBeDefined();
    expect(body.product.name).toContain("Royal Oak");
    expect(body.cryptography).toBeDefined();
    expect(body.cryptography.algorithm).toBe("SHA-256");
    expect(body.cryptography.signatureAlgorithm).toBe("HMAC-SHA256");
    expect(body.cryptography.hashValid).toBe(true);
    expect(body.cryptography.signatureValid).toBe(true);
    expect(body.provenance).toBeDefined();
    expect(body.provenance.chainValid).toBe(true);
    expect(body.provenance.events).toBeInstanceOf(Array);
    expect(body.verification).toBeDefined();
    expect(body.verification.authentic).toBe(true);
  });

  test("GET /api/products/qr returns image for valid code", async ({ request }) => {
    const res = await request.get(`/api/products/qr?code=${WATCH_CODE}`);
    expect(res.ok()).toBe(true);
    const contentType = res.headers()["content-type"];
    expect(contentType).toMatch(/image\/(png|svg)/);
  });

  test("verify all 5 demo products are authentic", async ({ request }) => {
    const codes = [WATCH_CODE, HANDBAG_CODE, PERFUME_CODE, NAUTILUS_CODE, SUNGLASSES_CODE];
    for (const code of codes) {
      const res = await request.get(`/api/products/verify?code=${code}`);
      expect(res.ok()).toBe(true);
      const body = await res.json();
      expect(body.authentic).toBe(true);
      expect(body.certificate.signatureValid).toBe(true);
      expect(body.certificate.chainIntegrity).toBe(true);
    }
  });
});

test.describe("Scans and Threats API", () => {
  test("GET /api/scans returns scan history with locations", async ({ request }) => {
    const res = await request.get(`/api/scans?productId=${WATCH_PRODUCT_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.scans).toBeInstanceOf(Array);
    expect(body.locations).toBeInstanceOf(Array);
    expect(typeof body.totalScans).toBe("number");
  });

  test("GET /api/threats returns threats for brand", async ({ request }) => {
    const res = await request.get(`/api/threats?brandId=${BRAND_ID}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.threats).toBeInstanceOf(Array);
    expect(typeof body.count).toBe("number");
    if (body.threats.length > 0) {
      expect(body.threats[0]).toHaveProperty("type");
      expect(body.threats[0]).toHaveProperty("severity");
      expect(body.threats[0]).toHaveProperty("timestamp");
    }
  });

  test("GET /api/threats without brandId returns 400", async ({ request }) => {
    const res = await request.get("/api/threats");
    expect(res.status()).toBe(400);
  });
});

test.describe("Analytics and Ops Log API", () => {
  test("GET /api/analytics returns full analytics payload", async ({ request }) => {
    const res = await request.get("/api/analytics");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(typeof body.totalScans).toBe("number");
    expect(typeof body.totalProducts).toBe("number");
    expect(body.dailyScans).toBeInstanceOf(Array);
    expect(body.topCountries).toBeInstanceOf(Array);
    expect(body.hourlyDistribution).toBeInstanceOf(Array);
    expect(body.hourlyDistribution.length).toBe(24);
    expect(body.categoryBreakdown).toBeInstanceOf(Array);
    expect(body.statusBreakdown).toBeDefined();
  });

  test("GET /api/ops-log returns AI operations with stats", async ({ request }) => {
    const res = await request.get("/api/ops-log?limit=5");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.entries).toBeInstanceOf(Array);
    expect(body.stats).toBeDefined();
    expect(body.stats.geminiModel).toBe("gemini-2.5-flash");
    expect(typeof body.stats.totalOperations).toBe("number");
    expect(typeof body.stats.avgLatencyMs).toBe("number");
    expect(typeof body.stats.avgConfidence).toBe("number");
  });

  test("GET /api/explore returns public products", async ({ request }) => {
    const res = await request.get("/api/explore?limit=10");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.products).toBeInstanceOf(Array);
    expect(typeof body.count).toBe("number");
  });
});

test.describe("Catalog API", () => {
  test("GET /api/catalog/locations returns locations with counts", async ({ request }) => {
    const res = await request.get("/api/catalog/locations");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.locations).toBeDefined();
    expect(body.count).toBeDefined();
  });

  test("GET /api/catalog/actors?type=carriers returns only carriers", async ({ request }) => {
    const res = await request.get("/api/catalog/actors?type=carriers");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.type).toBe("carriers");
    expect(body.actors).toBeInstanceOf(Array);
    expect(body.count).toBe(13);
  });
});

test.describe("Stripe API", () => {
  test("GET /api/stripe/checkout returns pricing plans", async ({ request }) => {
    const res = await request.get("/api/stripe/checkout");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.plans).toBeDefined();
    expect(body.plans.starter).toBeDefined();
    expect(body.plans.brand).toBeDefined();
    expect(body.plans.business).toBeDefined();
  });
});

test.describe("Integration API", () => {
  test("GET /api/integrations/journeys returns all 4 journeys with stages", async ({ request }) => {
    const res = await request.get("/api/integrations/journeys");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.journeys.length).toBe(4);
    for (const journey of body.journeys) {
      expect(journey).toHaveProperty("id");
      expect(journey).toHaveProperty("name");
      expect(journey).toHaveProperty("stages");
      expect(journey.stages.length).toBeGreaterThan(0);
    }
  });
});
