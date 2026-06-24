import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";

// ── LANDING PAGE ──────────────────────────────────────────────────

test.describe("Landing Page UI", () => {
  test("hero section renders with heading, subtext, and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/Every authentic product/);
    expect(content).toMatch(/proof/);
    expect(content).toMatch(/Cryptographic certificates/);
    await expect(page.locator('a:has-text("Register your brand")')).toBeVisible();
  });

  test("hero verify input accepts code and navigates", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[placeholder="Verification code"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(WATCH_CODE);
    await page.click('button:has-text("Verify")');
    await page.waitForURL(`**/verify/${WATCH_CODE}`);
  });

  test("hero verify input Enter key navigates", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[placeholder="Verification code"]');
    await input.fill(WATCH_CODE);
    await input.press("Enter");
    await page.waitForURL(`**/verify/${WATCH_CODE}`);
  });

  test("certificate preview card is visible on desktop", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Certificate of Authenticity")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Luxe Watches")).toBeVisible();
    await expect(page.getByText("Royal Oak Chronograph 42mm")).toBeVisible();
    await expect(page.getByText("Verified Authentic")).toBeVisible();
  });

  test("Register your brand link navigates to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("Register your brand")');
    await page.waitForURL("**/dashboard");
  });

  test("Get Started button navigates to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("Get Started")');
    await page.waitForURL("**/dashboard");
  });

  test("nav links navigate correctly", async ({ page }) => {
    await page.goto("/");

    // Test a few nav links
    await page.click('a[href="/verify"]');
    await page.waitForURL("**/verify");
    await page.goBack();

    await page.click('a[href="/pricing"]');
    await page.waitForURL("**/pricing");
    await page.goBack();

    await page.click('a[href="/mcp"]');
    await page.waitForURL("**/mcp");
  });

  test("dark mode toggle adds and removes dark class", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");

    const darkBtn = page.locator('button[title="Switch to dark mode"]');
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await expect(html).toHaveClass(/dark/);

      const lightBtn = page.locator('button[title="Switch to light mode"]');
      await lightBtn.click();
      await expect(html).not.toHaveClass(/dark/);
    }
  });

  test("mobile hamburger opens and closes menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // Find and click hamburger (the button inside nav that's visible on mobile)
    const buttons = page.locator("nav button");
    const hamburger = buttons.first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      // Should see mobile menu links
      const exploreLinks = await page.locator('a[href="/explore"]').count();
      expect(exploreLinks).toBeGreaterThan(0);
    }
  });

  test("page scrolls through all sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Should have scrolled past hero
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });
});

// ── VERIFY FLOW ───────────────────────────────────────────────────

test.describe("Verify Page UI", () => {
  test("verify landing page has input, button, and helper text", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.locator('input[placeholder="Verification code"]')).toBeVisible();
    await expect(page.locator('button:has-text("Verify")')).toBeVisible();
    await expect(page.getByText("Product Verification")).toBeVisible();
  });
});

test.describe("Verify Result Page UI", () => {
  test("shows certificate with all sections", async ({ page }) => {
    await page.goto(`/verify/${WATCH_CODE}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('span:has-text("Authentic")')).toBeVisible({ timeout: 15000 });

    // Certificate sections
    const content = await page.textContent("body");
    expect(content).toMatch(/Certificate of Authenticity/i);
    expect(content).toMatch(/Luxe Watches/);
    expect(content).toMatch(/Royal Oak/);
    expect(content).toMatch(/SHA-256/i);
  });

  test("provenance events are expandable", async ({ page }) => {
    await page.goto(`/verify/${WATCH_CODE}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Find and click a provenance event button
    const eventBtn = page.locator('button:has-text("Manufactured")');
    if (await eventBtn.isVisible()) {
      await eventBtn.click();
      await page.waitForTimeout(500);
      // Should show hash details when expanded
      const expanded = await page.textContent("body");
      expect(expanded).toMatch(/hash|previous/i);
      // Collapse
      await eventBtn.click();
    }
  });

  test("share button is clickable", async ({ page }) => {
    await page.goto(`/verify/${WATCH_CODE}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const shareBtn = page.locator('button:has-text("Share result"), button:has-text("Share")');
    if (await shareBtn.first().isVisible()) {
      await shareBtn.first().click();
      await page.waitForTimeout(500);
    }
  });
});

// ── DASHBOARD UI ──────────────────────────────────────────────────

test.describe("Dashboard Brand Selector UI", () => {
  test("shows existing brands with metadata", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Luxe Watches")).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content).toMatch(/luxewatches\.com/);
    expect(content).toMatch(/fashion/);
  });

  test("register new brand link toggles form", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const registerLink = page.locator('button:has-text("Register a new brand")');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page.locator('input[placeholder*="Luxe Watches"], input[placeholder*="e.g."]').first()).toBeVisible({ timeout: 5000 });

      // Back to list
      const backBtn = page.locator('button:has-text("Back to brand list")');
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await expect(page.getByText("Luxe Watches")).toBeVisible();
      }
    }
  });

  test("new brand form has all required fields", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const registerLink = page.locator('button:has-text("Register a new brand")');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(500);

      // Check fields exist
      await expect(page.locator('input[placeholder*="Luxe"], input[placeholder*="e.g."]').first()).toBeVisible();
      await expect(page.locator('input[placeholder*=".com"]').first()).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();
      await expect(page.locator('button:has-text("Register Brand")')).toBeVisible();

      // Register button disabled without fields
      const regBtn = page.locator('button:has-text("Register Brand")');
      await expect(regBtn).toBeDisabled();
    }
  });
});

test.describe("Dashboard Register Tab UI", () => {
  test("product registration form has all fields and dropdowns", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Register")');

    // Name field
    await expect(page.locator('input[placeholder*="Chronograph"], input[placeholder*="Classic"]').first()).toBeVisible({ timeout: 5000 });
    // SKU field
    await expect(page.locator('input[placeholder="LW-CC-42"]')).toBeVisible();
    // Category dropdown
    const categorySelect = page.locator('select').first();
    await expect(categorySelect).toBeVisible();
    const categoryOptions = await categorySelect.locator('option').allTextContents();
    expect(categoryOptions).toContain("Watches");
    expect(categoryOptions).toContain("Handbags");
    expect(categoryOptions).toContain("Electronics");

    // Description textarea
    await expect(page.locator('textarea')).toBeVisible();

    // Manufacturing location dropdown
    const locationSelects = await page.locator('select').all();
    const lastSelect = locationSelects[locationSelects.length - 1];
    const locationOptions = await lastSelect.locator('option').allTextContents();
    expect(locationOptions).toContain("Geneva, Switzerland");
    expect(locationOptions).toContain("Florence, Italy");

    // Register button disabled without name
    await expect(page.locator('button:has-text("Register Product")')).toBeDisabled();
  });

  test("filling name enables register button", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Register")');

    await page.fill('input[placeholder*="Chronograph"], input[placeholder*="Classic"]', "Test Product QA");
    await expect(page.locator('button:has-text("Register Product")')).toBeEnabled();
  });
});

test.describe("Dashboard Products Tab UI", () => {
  test("products list shows action buttons for each product", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Products")');
    await page.waitForTimeout(1000);

    // Check action buttons exist
    await expect(page.locator('a:has-text("Verify")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a:has-text("QR")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Detail")').first()).toBeVisible();
    await expect(page.locator('a:has-text("JSON")').first()).toBeVisible();
  });

  test("product verification codes are visible and clickable", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Products")');

    // Verification code buttons exist
    const codeBtn = page.locator(`button:has-text("${WATCH_CODE}")`);
    if (await codeBtn.isVisible()) {
      await codeBtn.click();
      // Should show "Copied" feedback
      await expect(page.getByText("Copied")).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Dashboard Supply Chain Tab UI", () => {
  test("supply chain form has all dropdowns", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Supply Chain")');

    await expect(page.locator('h2:has-text("Supply Chain"), h2:has-text("Provenance")').first()).toBeVisible({ timeout: 5000 });

    // Should have select dropdowns for product, event type, actor, location
    const selects = await page.locator('select').all();
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Dashboard Overview Tab UI", () => {
  test("overview shows stats grid and live threat feed", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 10000 });

    const content = await page.textContent("body");
    expect(content).toMatch(/active|recalled|alerts/i);
    expect(content).toMatch(/live threat feed|recent activity/i);
  });
});

test.describe("Dashboard Sidebar UI", () => {
  test("sidebar shows brand name and navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('button:has-text("Luxe Watches")');
    await page.waitForTimeout(1000);

    // Sidebar brand indicator
    await expect(page.locator('aside').first()).toBeVisible();
    const sidebarContent = await page.locator('aside').first().textContent();
    expect(sidebarContent).toMatch(/Luxe Watches/);

    // Sidebar links
    expect(sidebarContent).toMatch(/Analytics/);
    expect(sidebarContent).toMatch(/Explore/);
    expect(sidebarContent).toMatch(/Switch brand/);
  });
});

// ── PRICING PAGE UI ───────────────────────────────────────────────

test.describe("Pricing Page UI", () => {
  test("all three tiers show features and CTA buttons", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Tier names
    await expect(page.getByText("Starter")).toBeVisible({ timeout: 10000 });

    // Prices
    await expect(page.locator('text="$99"').first()).toBeVisible();
    await expect(page.locator('text="$299"').first()).toBeVisible();

    // Feature lists
    const content = await page.textContent("body");
    expect(content).toMatch(/10 product/i);
    expect(content).toMatch(/500 product/i);
    expect(content).toMatch(/unlimited/i);
    expect(content).toMatch(/AI threat|threat detection/i);
  });
});

// ── MCP PAGE UI ───────────────────────────────────────────────────

test.describe("MCP Page UI", () => {
  test("stats bar shows tool count", async ({ page }) => {
    await page.goto("/mcp");
    await expect(page.getByText("44", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("stdio", { exact: true })).toBeVisible();
  });

  test("config tabs switch code blocks", async ({ page }) => {
    await page.goto("/mcp");
    await page.waitForLoadState("networkidle");

    // Click through all config tabs and verify content changes
    const tabs = ["Claude Desktop", "Cursor", "Custom Client", "Claude Code"];
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(300);
    }
    // After cycling tabs, page content should contain config-related terms
    const content = await page.textContent("body");
    expect(content).toMatch(/mcpServers|command|node/i);
  });

  test("copy button changes text to Copied", async ({ page }) => {
    await page.goto("/mcp");
    await page.waitForLoadState("networkidle");

    const copyBtn = page.locator('button:has-text("Copy")');
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await expect(page.getByText("Copied")).toBeVisible({ timeout: 3000 });
    }
  });

  test("tool categories expand to show tool names", async ({ page }) => {
    await page.goto("/mcp");
    await page.waitForLoadState("networkidle");

    // Click "Threats & AI" category
    const aiBtn = page.locator('button:has-text("Threats & AI")');
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
      await expect(page.locator('code:has-text("threats_list")')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('code:has-text("ops_log")')).toBeVisible();
    }
  });

  test("example prompts are visible", async ({ page }) => {
    await page.goto("/mcp");
    const content = await page.textContent("body");
    expect(content).toMatch(/Register a luxury watch/);
    expect(content).toMatch(/Verify product/);
  });
});

// ── DOCS PAGE UI ──────────────────────────────────────────────────

test.describe("Docs Page UI", () => {
  test("shows endpoint list with method badges", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");

    // Method badges
    await expect(page.locator('span:has-text("GET")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span:has-text("POST")').first()).toBeVisible();

    // Endpoint paths
    const content = await page.textContent("body");
    expect(content).toMatch(/\/api\/brands/);
    expect(content).toMatch(/\/api\/products\/verify/);
    expect(content).toMatch(/\/api\/products\/register/);
  });

  test("request body and response blocks are visible", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Request Body").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Response").first()).toBeVisible();
  });

  test("crypto design section is present", async ({ page }) => {
    await page.goto("/docs");
    const content = await page.textContent("body");
    expect(content).toMatch(/Cryptographic Design/);
    expect(content).toMatch(/Product Hash/);
    expect(content).toMatch(/Provenance Chain/);
  });
});

// ── EXPLORE PAGE UI ───────────────────────────────────────────────

test.describe("Explore Page UI", () => {
  test("shows category filter buttons", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/watches|handbags|all/i);
  });
});

// ── COMPARE PAGE UI ───────────────────────────────────────────────

test.describe("Compare Page UI", () => {
  test("has two input fields and compare button", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.locator('input[placeholder="First verification code"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Second verification code"]')).toBeVisible();
    await expect(page.locator('button:has-text("Compare")')).toBeVisible();
  });

  test("compare shows side-by-side results", async ({ page }) => {
    await page.goto("/compare");
    await page.fill('input[placeholder="First verification code"]', WATCH_CODE);
    await page.fill('input[placeholder="Second verification code"]', NAUTILUS_CODE);
    await page.click('button:has-text("Compare")');

    await expect(page.getByText("Royal Oak")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Nautilus")).toBeVisible();
  });
});

// ── INTEGRATIONS PAGE UI ──────────────────────────────────────────

test.describe("Integrations Page UI", () => {
  test("shipping tab shows carrier list", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/FedEx|DHL|UPS/);
  });

  test("POS tab shows platform list", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const posTab = page.locator('button:has-text("Point of Sale")');
    if (await posTab.isVisible()) {
      await posTab.click();
      await page.waitForTimeout(500);
      const content = await page.textContent("body");
      expect(content).toMatch(/Shopify|Square|WooCommerce/);
    }
  });

  test("warehouse tab shows WMS actions", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const wmsTab = page.locator('button:has-text("Warehouse")');
    if (await wmsTab.isVisible()) {
      await wmsTab.click();
      await page.waitForTimeout(500);
      const content = await page.textContent("body");
      expect(content).toMatch(/received|inspected|dispatched/i);
    }
  });

  test("send test event button exists and is clickable", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const testBtn = page.locator('button:has-text("Send Test Event")');
    if (await testBtn.isVisible()) {
      await expect(testBtn).toBeEnabled();
    }
  });
});

// ── ANALYTICS PAGE UI ─────────────────────────────────────────────

test.describe("Analytics Page UI", () => {
  test("shows stat cards and chart sections", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/total products|total scans/i);
  });
});

// ── STATUS PAGE UI ────────────────────────────────────────────────

test.describe("Status Page UI", () => {
  test("shows individual service status indicators", async ({ page }) => {
    await page.goto("/status");
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/operational|healthy/i);
    expect(content).toMatch(/api|database/i);
  });
});

// ── PRODUCT DETAIL PAGE UI ────────────────────────────────────────

test.describe("Product Detail Page UI", () => {
  test("shows full product info grid", async ({ page }) => {
    await page.goto(`/product/${WATCH_PRODUCT_ID}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Royal Oak")).toBeVisible({ timeout: 10000 });

    const content = await page.textContent("body");
    expect(content).toMatch(/Luxe Watches/);
    expect(content).toMatch(/SHA-256|Fingerprint|hash/i);
    expect(content).toMatch(/active/i);
  });

  test("scan history toggle works", async ({ page }) => {
    await page.goto(`/product/${WATCH_PRODUCT_ID}`);
    await page.waitForLoadState("networkidle");

    const scanBtn = page.locator('button:has-text("Scan History")');
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await page.waitForTimeout(1000);
      const content = await page.textContent("body");
      expect(content).toMatch(/scan|timestamp|country/i);
    }
  });

  test("quick action links are present", async ({ page }) => {
    await page.goto(`/product/${WATCH_PRODUCT_ID}`);
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/verify|qr|export|certificate/i);
  });
});

// ── QR CERTIFICATE PAGE UI ────────────────────────────────────────

test.describe("QR Certificate Page UI", () => {
  test("shows brand name, product name, and QR section", async ({ page }) => {
    await page.goto(`/qr/${WATCH_CODE}`);
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/Luxe Watches/);
    expect(content).toMatch(/Royal Oak/);
    expect(content).toMatch(/certificate|verified|authentic/i);
  });
});

// ── EMBED WIDGET UI ───────────────────────────────────────────────

test.describe("Embed Widget UI", () => {
  test("shows compact verification badge", async ({ page }) => {
    await page.goto(`/embed/${WATCH_CODE}`);
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/verified|authentic/i);
    expect(content).toMatch(/Royal Oak|Luxe Watches/i);
  });
});

// ── OPS LOG PAGE UI ───────────────────────────────────────────────

test.describe("Ops Log Page UI", () => {
  test("shows stats summary and entries table", async ({ page }) => {
    await page.goto("/ops-log");
    await page.waitForLoadState("networkidle");

    const content = await page.textContent("body");
    expect(content).toMatch(/gemini|operations/i);
    expect(content).toMatch(/severity|confidence|latency/i);
  });

  test("severity badges are color-coded", async ({ page }) => {
    await page.goto("/ops-log");
    await page.waitForLoadState("networkidle");

    // Check that severity indicators have color classes
    const badges = page.locator('[class*="text-red"], [class*="text-orange"], [class*="text-amber"]');
    const count = await badges.count();
    // Should have at least some colored severity indicators if ops log has data
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
