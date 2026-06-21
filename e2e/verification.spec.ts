import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const INVALID_CODE = "COUNTERFEIT_CLONED_TAG";

test.describe("Product Verification API", () => {
  test("verifies authentic product with valid signature and chain", async ({ request }) => {
    const res = await request.get(`/api/products/verify?code=${WATCH_CODE}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.authentic).toBe(true);
    expect(body.product).toBeTruthy();
    expect(body.product.name).toContain("Royal Oak");
    expect(body.certificate.signatureValid).toBe(true);
    expect(body.certificate.chainIntegrity).toBe(true);
    expect(body.events).toBeDefined();
    expect(body.events.length).toBeGreaterThan(0);
  });

  test("rejects invalid code (404) and missing params (400)", async ({ request }) => {
    const notFound = await request.get(`/api/products/verify?code=${INVALID_CODE}`);
    expect(notFound.status()).toBe(404);
    const notFoundBody = await notFound.json();
    expect(notFoundBody.authentic).toBe(false);

    const badReq = await request.get("/api/products/verify");
    expect(badReq.status()).toBe(400);
    const badReqBody = await badReq.json();
    expect(badReqBody.error).toContain("required");
  });
});

test.describe("Verification UI Flow", () => {
  test("verify page loads and accepts a code", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.locator('input[placeholder="Verification code"]')).toBeVisible();
    await page.fill('input[placeholder="Verification code"]', WATCH_CODE);
    await page.click('button:has-text("Verify")');
    await expect(page.getByText("AUTHENTIC")).toBeVisible({ timeout: 15000 });
  });

  test("direct verify URL shows authentic result", async ({ page }) => {
    await page.goto(`/verify/${WATCH_CODE}`);
    await expect(page.locator('span:has-text("Authentic")')).toBeVisible({ timeout: 15000 });
  });

  test("invalid code shows failed verification", async ({ page }) => {
    await page.goto(`/verify/${INVALID_CODE}`);
    await expect(page.locator('span:has-text("Failed")')).toBeVisible({ timeout: 15000 });
  });
});
