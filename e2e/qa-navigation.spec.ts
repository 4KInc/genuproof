import { test, expect } from "@playwright/test";

const PAGES_WITH_FULL_NAV = [
  "/",
  "/verify",
  "/dashboard",
  "/docs",
  "/pricing",
  "/integrations",
  "/mcp",
  "/explore",
  "/compare",
  "/analytics",
  "/ops-log",
  "/status",
];

test.describe("Navigation Consistency", () => {
  for (const path of PAGES_WITH_FULL_NAV) {
    test(`${path} has full navigation with all links`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      // Check all nav links exist
      await expect(page.locator('a[href="/explore"]').first()).toBeAttached();
      await expect(page.locator('a[href="/verify"]').first()).toBeAttached();
      await expect(page.locator('a[href="/dashboard"]').first()).toBeAttached();
      await expect(page.locator('a[href="/docs"]').first()).toBeAttached();
      await expect(page.locator('a[href="/pricing"]').first()).toBeAttached();
      await expect(page.locator('a[href="/integrations"]').first()).toBeAttached();
      await expect(page.locator('a[href="/mcp"]').first()).toBeAttached();
    });
  }

  test("embed page has no site navigation", async ({ page }) => {
    await page.goto("/embed/wfPHybaFV3_a");
    await page.waitForLoadState("domcontentloaded");
    const navLinks = await page.locator('a[href="/explore"]').count();
    expect(navLinks).toBe(0);
  });
});

test.describe("Mobile Navigation", () => {
  test("hamburger menu works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Find hamburger button (the sm:hidden button in nav)
    const hamburger = page.locator("nav button").first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      // Mobile menu should show links
      const mobileLinks = await page.locator('a[href="/explore"]').count();
      expect(mobileLinks).toBeGreaterThan(0);
    }
  });
});

test.describe("Dark Mode", () => {
  test("dark mode toggle works on landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const darkBtn = page.locator('button[title="Switch to dark mode"]');
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await expect(page.locator("html.dark")).toBeAttached();

      const lightBtn = page.locator('button[title="Switch to light mode"]');
      await lightBtn.click();
      await expect(page.locator("html.dark")).not.toBeAttached();
    }
  });
});
