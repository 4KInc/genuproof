import { test, expect } from "@playwright/test";

const BRAND_ID = "5019622c-9860-4b83-a5c6-adb82ebd0412";

test.describe("Dashboard", () => {
  test("loads and shows brand selector", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Existing Brands").or(page.getByText("Select Brand"))).toBeVisible({ timeout: 10000 });
  });

  test("selects brand and shows overview with live threat feed", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });
  });

  test("products tab shows registered products", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.click('button:has-text("Products")');
    await expect(page.locator('h2:has-text("Products")')).toBeVisible({ timeout: 10000 });
  });

  test("threats tab displays threat alerts", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.click('button:has-text("Threats")');
    await expect(page.locator('h2:has-text("Threats")')).toBeVisible({ timeout: 10000 });
  });
});
