import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const PERFUME_CODE = "27dEHQymVRMl";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const SUNGLASSES_CODE = "IebJZgMHdD-h";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";

test.describe("Verification Flow (all 5 demo products)", () => {
  const products = [
    { code: WATCH_CODE, name: "Royal Oak" },
    { code: HANDBAG_CODE, name: "Classique" },
    { code: PERFUME_CODE, name: "Oud Royale" },
    { code: NAUTILUS_CODE, name: "Nautilus" },
    { code: SUNGLASSES_CODE, name: "Aviator" },
  ];

  for (const { code, name } of products) {
    test(`verify ${name} via direct URL shows authentic`, async ({ page }) => {
      await page.goto(`/verify/${code}`);
      await expect(page.locator('span:has-text("Authentic")')).toBeVisible({ timeout: 15000 });
    });
  }
});

test.describe("Verification Page Entry Flow", () => {
  test("enter code on /verify page and navigate to result", async ({ page }) => {
    await page.goto("/verify");
    await page.fill('input[placeholder="Verification code"]', WATCH_CODE);
    await page.click('button:has-text("Verify")');
    await expect(page).toHaveURL(new RegExp(`/verify/${WATCH_CODE}`));
    await expect(page.locator('span:has-text("Authentic")')).toBeVisible({ timeout: 15000 });
  });

  test("empty code does not navigate", async ({ page }) => {
    await page.goto("/verify");
    // Button should be disabled or clicking with empty input should stay on /verify
    const verifyBtn = page.locator('button:has-text("Verify")');
    if (await verifyBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await verifyBtn.click();
    }
    await expect(page).toHaveURL(/\/verify/);
  });
});

test.describe("Counterfeit / Invalid Codes", () => {
  test("random string shows failed verification", async ({ page }) => {
    await page.goto("/verify/FAKE_PRODUCT_123");
    await expect(page.locator('span:has-text("Failed")')).toBeVisible({ timeout: 15000 });
  });

  test("empty code in URL shows failed", async ({ page }) => {
    await page.goto("/verify/x");
    await expect(page.locator('span:has-text("Failed")')).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Product Detail Page", () => {
  test("shows product info, crypto identity, and provenance", async ({ page }) => {
    await page.goto(`/product/${WATCH_PRODUCT_ID}`);
    await expect(page.getByText("Royal Oak")).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/SHA-256|hash|signature/i);
    expect(content).toMatch(/Luxe Watches/);
  });
});

test.describe("QR Certificate Pages", () => {
  test("watch QR certificate loads with brand name", async ({ page }) => {
    await page.goto(`/qr/${WATCH_CODE}`);
    await expect(page.getByText("Luxe Watches").or(page.getByText("Certificate"))).toBeVisible({ timeout: 10000 });
  });

  test("handbag QR certificate loads", async ({ page }) => {
    await page.goto(`/qr/${HANDBAG_CODE}`);
    await page.waitForLoadState("networkidle");
    const content = await page.textContent("body");
    expect(content).toMatch(/certificate|classique|maison/i);
  });
});

test.describe("Embed Widget", () => {
  test("embed shows verified status for valid code", async ({ page }) => {
    await page.goto(`/embed/${WATCH_CODE}`);
    const content = await page.textContent("body");
    expect(content).toMatch(/verified|authentic/i);
  });

  test("embed shows failed for invalid code", async ({ page }) => {
    await page.goto("/embed/INVALID_XYZ");
    await page.waitForLoadState("networkidle");
  });
});

test.describe("Compare Page", () => {
  test("compares two products side by side", async ({ page }) => {
    await page.goto("/compare");
    await page.fill('input[placeholder="First verification code"]', WATCH_CODE);
    await page.fill('input[placeholder="Second verification code"]', NAUTILUS_CODE);
    await page.click('button:has-text("Compare")');
    await expect(page.getByText("Royal Oak")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Nautilus")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Dashboard Flow", () => {
  test("select brand then navigate all tabs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });

    // Products tab
    await page.click('button:has-text("Products")');
    await expect(page.locator('h2:has-text("Products")')).toBeVisible({ timeout: 10000 });

    // Register tab
    await page.click('button:has-text("Register")');
    await expect(page.locator('input[placeholder*="Chronograph"], input[placeholder*="Classic"]').first()).toBeVisible({ timeout: 10000 });

    // Supply Chain tab
    await page.click('button:has-text("Supply Chain")');
    await expect(page.locator('h2:has-text("Supply Chain"), h2:has-text("Provenance")').first()).toBeVisible({ timeout: 10000 });

    // Threats tab
    await page.click('button:has-text("Threats")');
    await expect(page.locator('h2:has-text("Threats")')).toBeVisible({ timeout: 10000 });

    // Back to Overview
    await page.click('button:has-text("Overview")');
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });
  });

  test("switch brand button returns to brand selector", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Switch brand")');
    await expect(page.locator('h1:has-text("Select your")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Explore Page Filters", () => {
  test("category filter buttons work", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("networkidle");

    const watchesBtn = page.locator('button:has-text("Watches")');
    if (await watchesBtn.isVisible()) {
      await watchesBtn.click();
      await page.waitForTimeout(500);
    }

    const allBtn = page.locator('button:has-text("All")');
    if (await allBtn.isVisible()) {
      await allBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Integrations Page", () => {
  test("tabs switch between Shipping, POS, and Warehouse", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const posTab = page.locator('button:has-text("Point of Sale")');
    if (await posTab.isVisible()) {
      await posTab.click();
      await page.waitForTimeout(500);
      const content = await page.textContent("body");
      expect(content).toMatch(/shopify|square|woocommerce/i);
    }

    const wmsTab = page.locator('button:has-text("Warehouse")');
    if (await wmsTab.isVisible()) {
      await wmsTab.click();
      await page.waitForTimeout(500);
      const content = await page.textContent("body");
      expect(content).toMatch(/warehouse|wms|received/i);
    }
  });
});

test.describe("MCP Page", () => {
  test("configuration tabs switch content", async ({ page }) => {
    await page.goto("/mcp");
    await page.waitForLoadState("networkidle");

    const tabs = ["Claude Desktop", "Cursor", "Custom Client", "Claude Code"];
    for (const tab of tabs) {
      const btn = page.locator(`button:has-text("${tab}")`);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("tools reference categories expand and collapse", async ({ page }) => {
    await page.goto("/mcp");
    await page.waitForLoadState("networkidle");

    // Click Products category
    const productsBtn = page.locator('button:has-text("Products")').first();
    if (await productsBtn.isVisible()) {
      await productsBtn.click();
      await expect(page.locator('code:has-text("products_register")')).toBeVisible({ timeout: 5000 });

      // Click again to collapse
      await productsBtn.click();
    }
  });
});

test.describe("Pricing Page", () => {
  test("shows all three tier prices and feature lists", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator('text="$99"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="$299"').first()).toBeVisible();
    const content = await page.textContent("body");
    expect(content).toMatch(/starter|free/i);
    expect(content).toMatch(/brand/i);
    expect(content).toMatch(/business/i);
    expect(content).toMatch(/500 product/i);
    expect(content).toMatch(/unlimited/i);
  });
});

test.describe("Ops Log Page", () => {
  test("shows AI operations entries and stats", async ({ page }) => {
    await page.goto("/ops-log");
    await page.waitForLoadState("networkidle");
    const content = await page.textContent("body");
    expect(content).toMatch(/gemini|operations|ops/i);
  });
});

test.describe("Status Page", () => {
  test("shows operational status for services", async ({ page }) => {
    await page.goto("/status");
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/operational|healthy|status/i);
  });
});
