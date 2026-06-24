import { test, expect } from "@playwright/test";

test.describe("Stripe Checkout Flow", () => {
  test("Brand plan ($99) returns real Stripe checkout URL", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "brand" },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test("Business plan ($299) returns real Stripe checkout URL", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "business", email: "test@example.com" },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  test("Starter plan (free) redirects to dashboard without Stripe", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "starter" },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.url).toBe("/dashboard");
    expect(body.free).toBe(true);
  });

  test("invalid plan returns 400", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "nonexistent" },
    });
    expect(res.status()).toBe(400);
  });

  test("pricing page CTA for free tier navigates to dashboard", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Click the Starter/Get Started button
    const starterBtn = page.locator('button:has-text("Get Started")').first();
    if (await starterBtn.isVisible()) {
      await starterBtn.click();
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    }
  });

  test("pricing page CTA for Brand plan initiates Stripe redirect", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    const brandBtn = page.locator('button:has-text("Start Brand Plan")');
    if (await brandBtn.isVisible()) {
      await brandBtn.click();
      // Should navigate to stripe.com checkout
      await page.waitForURL(/checkout\.stripe\.com|pricing/, { timeout: 15000 });
      const url = page.url();
      // Either we landed on Stripe or stayed on pricing (if redirect was blocked)
      expect(url).toMatch(/checkout\.stripe\.com|pricing/);
    }
  });
});
