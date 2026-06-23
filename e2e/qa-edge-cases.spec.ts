import { test, expect } from "@playwright/test";

const BRAND_ID = "5019622c-9860-4b83-a5c6-adb82ebd0412";
const WATCH_CODE = "wfPHybaFV3_a";

test.describe("API Error Handling", () => {
  test("GET /api/products/list without brandId returns 400", async ({ request }) => {
    const res = await request.get("/api/products/list");
    expect(res.status()).toBe(400);
  });

  test("GET /api/scans without productId returns 400", async ({ request }) => {
    const res = await request.get("/api/scans");
    expect(res.status()).toBe(400);
  });

  test("GET /api/brands/stats without brandId returns 400", async ({ request }) => {
    const res = await request.get("/api/brands/stats");
    expect(res.status()).toBe(400);
  });

  test("GET /api/products/events without productId returns 400", async ({ request }) => {
    const res = await request.get("/api/products/events");
    expect(res.status()).toBe(400);
  });

  test("GET /api/products/certificate without code or productId returns 400", async ({ request }) => {
    const res = await request.get("/api/products/certificate");
    expect(res.status()).toBe(400);
  });

  test("GET /api/products/qr without code returns 400", async ({ request }) => {
    const res = await request.get("/api/products/qr");
    expect(res.status()).toBe(400);
  });

  test("POST /api/brands without required fields returns 400", async ({ request }) => {
    const res = await request.post("/api/brands", { data: { name: "Test" } });
    expect(res.status()).toBe(400);
  });

  test("POST /api/products/register without required fields returns 400", async ({ request }) => {
    const res = await request.post("/api/products/register", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST /api/products/recall without productId returns 400", async ({ request }) => {
    const res = await request.post("/api/products/recall", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST /api/products/claim without productId returns 400", async ({ request }) => {
    const res = await request.post("/api/products/claim", { data: {} });
    expect(res.status()).toBe(400);
  });
});

test.describe("API Response Structure Validation", () => {
  test("verify response has all expected top-level keys", async ({ request }) => {
    const res = await request.get(`/api/products/verify?code=${WATCH_CODE}`);
    const body = await res.json();
    expect(body).toHaveProperty("authentic");
    expect(body).toHaveProperty("product");
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("warnings");
    expect(body).toHaveProperty("scanCount");
    expect(body).toHaveProperty("certificate");
    expect(body).toHaveProperty("claim");
  });

  test("DPP export has all required ESPR sections", async ({ request }) => {
    const res = await request.get(`/api/products/dpp-export?code=${WATCH_CODE}`);
    const body = await res.json();
    expect(body["@context"]).toBe("https://schema.org/");
    expect(body["@type"]).toBe("Product");
    expect(body.dppVersion).toBe("1.0");
    expect(body.dppStandard).toBe("ESPR-2024/1781");
    expect(body).toHaveProperty("identification");
    expect(body).toHaveProperty("product");
    expect(body).toHaveProperty("manufacturer");
    expect(body).toHaveProperty("supplyChain");
    expect(body).toHaveProperty("verification");
    expect(body).toHaveProperty("sustainability");
    expect(body).toHaveProperty("metadata");
  });

  test("analytics hourly distribution has exactly 24 entries", async ({ request }) => {
    const res = await request.get("/api/analytics");
    const body = await res.json();
    expect(body.hourlyDistribution).toHaveLength(24);
    expect(body.dailyScans.length).toBe(7);
  });

  test("ops-log stats has all required breakdown fields", async ({ request }) => {
    const res = await request.get("/api/ops-log?limit=5");
    const body = await res.json();
    expect(body.stats).toHaveProperty("agentBreakdown");
    expect(body.stats).toHaveProperty("severityBreakdown");
    expect(body.stats).toHaveProperty("attackVectorBreakdown");
  });
});

test.describe("Cryptographic Integrity", () => {
  test("product hash is a valid 64-char hex SHA-256", async ({ request }) => {
    const res = await request.get(`/api/products/verify?code=${WATCH_CODE}`);
    const body = await res.json();
    expect(body.product.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.product.signature).toMatch(/^[a-f0-9]{64}$/);
  });

  test("provenance chain hashes are all valid 64-char hex", async ({ request }) => {
    const res = await request.get(`/api/products/verify?code=${WATCH_CODE}`);
    const body = await res.json();
    for (const event of body.events) {
      expect(event.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(event.previousHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("provenance chain links correctly (each event references previous hash)", async ({ request }) => {
    const res = await request.get(`/api/products/verify?code=${WATCH_CODE}`);
    const body = await res.json();
    const events = body.events;
    for (let i = 1; i < events.length; i++) {
      expect(events[i].previousHash).toBe(events[i - 1].hash);
    }
  });
});

test.describe("404 Pages", () => {
  test("nonexistent page returns a page (not crash)", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res).toBeTruthy();
  });

  test("product detail with invalid ID handles gracefully", async ({ page }) => {
    await page.goto("/product/nonexistent-product-id-xyz");
    await page.waitForLoadState("networkidle");
    // Should not crash, should show some error or empty state
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
