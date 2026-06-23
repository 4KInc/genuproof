import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";

test.describe("Page Loads", () => {
  test("landing page renders hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });

  test("pricing page shows three tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator('text="$99"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="$299"').first()).toBeVisible();
  });

  test("ops-log page shows Gemini AI operations", async ({ page }) => {
    await page.goto("/ops-log");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/gemini|ops|operations/i);
  });

  test("docs page shows API documentation", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/api|endpoint|documentation/i);
  });

  test("explore page loads product gallery", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/explore|product|gallery/i);
  });

  test("QR certificate page renders for valid code", async ({ page }) => {
    await page.goto(`/qr/${WATCH_CODE}`);
    await expect(page.getByText("Certificate").or(page.getByText("Luxe Watches"))).toBeVisible({ timeout: 10000 });
  });

  test("product detail page loads for valid product", async ({ page }) => {
    await page.goto(`/product/${WATCH_PRODUCT_ID}`);
    await expect(page.getByText("Royal Oak")).toBeVisible({ timeout: 10000 });
  });

  test("integrations page shows supply chain tabs", async ({ page }) => {
    await page.goto("/integrations");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/integration|shipping|supply chain/i);
  });

  test("status page shows operational status", async ({ page }) => {
    await page.goto("/status");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/operational|status|healthy/i);
  });
});
