import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";

test.describe("API Health & Catalog", () => {
  test("GET /api/health returns operational status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe("operational");
    expect(body.services.api).toBe("healthy");
    expect(body.services.database).toBe("healthy");
    expect(body.version).toBe("1.0.0");
  });

  test("GET /api/catalog/categories returns 14 categories", async ({ request }) => {
    const res = await request.get("/api/catalog/categories");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.count).toBe(14);
    const ids = body.categories.map((c: { id: string }) => c.id);
    expect(ids).toContain("watches");
    expect(ids).toContain("handbags");
    expect(ids).toContain("pharmaceuticals");
  });

  test("GET /api/catalog/actors returns 37 actors across 4 types", async ({ request }) => {
    const res = await request.get("/api/catalog/actors");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.count.total).toBe(37);
    expect(body.count.carriers).toBe(13);
    expect(body.count.warehouses).toBe(8);
    expect(body.count.inspection).toBe(8);
    expect(body.count.retailers).toBe(8);
  });

  test("GET /api/integrations/journeys returns 4 journey templates", async ({ request }) => {
    const res = await request.get("/api/integrations/journeys");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.journeys.length).toBe(4);
    const ids = body.journeys.map((j: { id: string }) => j.id);
    expect(ids).toContain("luxury_watch");
    expect(ids).toContain("fashion_handbag");
    expect(ids).toContain("pharmaceutical");
    expect(ids).toContain("electronics");
  });
});
