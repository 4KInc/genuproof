// Automated demo video recording using Playwright
// Full feature coverage — every feature demonstrated

import { chromium } from "playwright";

const BASE = "https://authentik-platform.vercel.app";
const DEMO_CODE = "wfPHybaFV3_a";
const COMPARE_CODE_A = "wfPHybaFV3_a";
const COMPARE_CODE_B = "FshGQLRNsr4p";
const PRODUCT_ID = "e084595c97320cfcc85309943f345760";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: "./demo-video-full",
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  // ═══ SCENE 1: Landing Page ═══
  console.log("=== Scene 1: Landing Page ===");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(2500);

  // Scroll through landing page
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy({ top: 450, behavior: "smooth" }));
    await sleep(1500);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 2: Dark Mode Toggle ═══
  console.log("=== Scene 2: Dark Mode Toggle ===");
  const darkToggle = page.locator('button[title="Switch to dark mode"]');
  if (await darkToggle.isVisible()) {
    await darkToggle.click();
    await sleep(2000);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(1000);
    // Switch back
    const lightToggle = page.locator('button[title="Switch to light mode"]');
    if (await lightToggle.isVisible()) {
      await lightToggle.click();
      await sleep(1500);
    }
  }

  // ═══ SCENE 3: Mobile Nav (resize + hamburger) ═══
  console.log("=== Scene 3: Mobile Nav ===");
  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(1500);
  const hamburger = page.locator("nav button.sm\\:hidden").first();
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await sleep(1500);
    await hamburger.click(); // close
    await sleep(800);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(1000);

  // ═══ SCENE 4: Verify a Product ═══
  console.log("=== Scene 4: Verify Product ===");
  await page.fill('input[placeholder="Verification code"]', DEMO_CODE);
  await sleep(800);
  await page.click('button:has-text("Verify")');
  await sleep(2500);
  await page.waitForSelector('text=AUTHENTIC', { timeout: 15000 });
  await sleep(2000);

  // Scroll through certificate
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
  await sleep(1500);

  // Expand provenance event
  const mfgEvent = page.locator('button:has-text("Manufactured")');
  if (await mfgEvent.isVisible()) {
    await mfgEvent.click();
    await sleep(2000);
    await mfgEvent.click();
    await sleep(500);
  }

  // Scroll to action bar
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 5: Share Result ═══
  console.log("=== Scene 5: Share Result ===");
  const shareBtn = page.locator('button:has-text("Share result")');
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await sleep(1500);
    // Dismiss the alert
    page.on("dialog", (d) => d.accept());
  }

  // ═══ SCENE 6: Export JSON Certificate ═══
  console.log("=== Scene 6: Export JSON Certificate ===");
  const exportLink = page.locator('a:has-text("Export JSON")').first();
  if (await exportLink.isVisible()) {
    // Just hover to show it — clicking downloads
    await exportLink.hover();
    await sleep(1500);
  }

  // ═══ SCENE 7: QR Certificate Page ═══
  console.log("=== Scene 7: QR Certificate ===");
  const qrLink = page.locator('a:has-text("QR Certificate")').first();
  if (await qrLink.isVisible()) {
    await qrLink.click();
    await sleep(1000);
    await page.waitForSelector('text=Luxe Watches', { timeout: 10000 });
    await sleep(2500);
    // Scroll to see full certificate
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await sleep(1500);
  }

  // ═══ SCENE 8: Product Detail with Scan History ═══
  console.log("=== Scene 8: Product Detail + Scan History ===");
  await page.goto(`${BASE}/product/${PRODUCT_ID}`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Royal Oak', { timeout: 10000 });
  await sleep(2000);

  // Scroll to crypto identity
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1500);

  // Scroll to QR and actions
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1500);

  // Click Export JSON certificate action
  const exportAction = page.locator('a:has-text("Export JSON certificate")');
  if (await exportAction.isVisible()) {
    await exportAction.hover();
    await sleep(1000);
  }

  // Scroll to scan history and expand it
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1000);
  const scanHistoryBtn = page.locator('button:has-text("Scan History")');
  if (await scanHistoryBtn.isVisible()) {
    await scanHistoryBtn.click();
    await sleep(2000);
  }

  // Scroll to provenance chain
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(2000);

  // ═══ SCENE 9: Dashboard — Brand Selector ═══
  console.log("=== Scene 9: Dashboard Brand Selector ===");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Existing Brands', { timeout: 10000 });
  await sleep(2000);

  // Click Luxe Watches
  await page.click('button:has-text("Luxe Watches")');
  await sleep(2500);

  // ═══ SCENE 10: Dashboard Overview — Live Threat Feed ═══
  console.log("=== Scene 10: Dashboard Overview + Live Threats ===");
  await page.waitForSelector('text=Live Threat Feed', { timeout: 10000 });
  await sleep(2000);

  // Scroll to see SSE connection and activity feed
  await page.evaluate(() => {
    document.querySelector("main")?.scrollBy({ top: 400, behavior: "smooth" });
  });
  await sleep(2000);
  await page.evaluate(() => {
    document.querySelector("main")?.scrollBy({ top: 400, behavior: "smooth" });
  });
  await sleep(2000);

  // ═══ SCENE 11: Products Tab with Actions ═══
  console.log("=== Scene 11: Products Tab ===");
  await page.click('button:has-text("Products")');
  await sleep(2000);

  // Scroll to see all products with action buttons
  await page.evaluate(() => {
    document.querySelector("main")?.scrollBy({ top: 300, behavior: "smooth" });
  });
  await sleep(2000);

  // ═══ SCENE 12: Recall a Product ═══
  console.log("=== Scene 12: Recall Product ===");
  // We'll hover over the Recall button to show it exists (not actually clicking to avoid dialog)
  const recallBtn = page.locator('button:has-text("Recall")').first();
  if (await recallBtn.isVisible()) {
    await recallBtn.hover();
    await sleep(1500);
  }

  // Hover Transfer button
  const transferBtn = page.locator('button:has-text("Transfer")').first();
  if (await transferBtn.isVisible()) {
    await transferBtn.hover();
    await sleep(1500);
  }

  // ═══ SCENE 13: Register a Product ═══
  console.log("=== Scene 13: Register Product ===");
  await page.evaluate(() => {
    document.querySelector("main")?.scrollTo({ top: 0 });
  });
  await sleep(500);
  await page.click('button:has-text("Register")');
  await sleep(1000);

  await page.fill('input[placeholder="e.g. Classic Chronograph 42mm"]', "Monaco Racing Chronograph");
  await sleep(400);
  await page.fill('input[placeholder="LW-CC-42"]', "LW-MRC-39");
  await sleep(400);
  await page.fill('input[placeholder="Watches"]', "Watches");
  await sleep(400);
  await page.fill('textarea[placeholder="Product description..."]', "Titanium case, automatic movement, racing-inspired dial");
  await sleep(400);
  await page.fill('input[placeholder="Geneva, Switzerland"]', "Le Locle, Switzerland");
  await sleep(800);

  await page.click('button:has-text("Register Product")');
  await sleep(2500);

  // ═══ SCENE 14: Supply Chain Event ═══
  console.log("=== Scene 14: Supply Chain Event ===");
  await page.click('button:has-text("Supply Chain")');
  await sleep(1500);

  // ═══ SCENE 15: Threats Tab ═══
  console.log("=== Scene 15: Threats Tab ===");
  await page.click('button:has-text("Threats")');
  await sleep(2000);

  // ═══ SCENE 16: Sidebar links — Analytics, Explore, Switch Brand ═══
  console.log("=== Scene 16: Sidebar Links ===");
  const analyticsLink = page.locator('aside a:has-text("Analytics")');
  if (await analyticsLink.isVisible()) {
    await analyticsLink.hover();
    await sleep(800);
  }
  const exploreLink = page.locator('aside a:has-text("Explore")');
  if (await exploreLink.isVisible()) {
    await exploreLink.hover();
    await sleep(800);
  }

  // ═══ SCENE 17: Explore Gallery ═══
  console.log("=== Scene 17: Explore Gallery ===");
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=products registered', { timeout: 10000 });
  await sleep(2000);

  // Click category filters
  const watchesFilter = page.locator('button:has-text("Watches")');
  if (await watchesFilter.isVisible()) {
    await watchesFilter.click();
    await sleep(1500);
  }
  const handbagFilter = page.locator('button:has-text("Handbags")');
  if (await handbagFilter.isVisible()) {
    await handbagFilter.click();
    await sleep(1500);
  }
  const allFilter = page.locator('button:has-text("All")');
  if (await allFilter.isVisible()) {
    await allFilter.click();
    await sleep(1500);
  }

  // ═══ SCENE 18: Compare ═══
  console.log("=== Scene 18: Compare ===");
  await page.goto(`${BASE}/compare`, { waitUntil: "networkidle" });
  await sleep(1500);

  await page.fill('input[placeholder="First verification code"]', COMPARE_CODE_A);
  await sleep(400);
  await page.fill('input[placeholder="Second verification code"]', COMPARE_CODE_B);
  await sleep(400);
  await page.click('button:has-text("Compare")');
  await sleep(1000);
  await page.waitForSelector('text=Royal Oak', { timeout: 10000 });
  await sleep(2500);

  // Scroll to see full comparison
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 19: Analytics ═══
  console.log("=== Scene 19: Analytics ===");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Total Products', { timeout: 10000 });
  await sleep(2000);

  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(2000);

  // ═══ SCENE 20: Status Page ═══
  console.log("=== Scene 20: Status Page ===");
  await page.goto(`${BASE}/status`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Operational', { timeout: 15000 });
  await sleep(2500);

  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 21: API Docs ═══
  console.log("=== Scene 21: API Docs ===");
  await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });
  await sleep(2000);

  // Scroll through endpoints
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 22: Embeddable Badge ═══
  console.log("=== Scene 22: Embeddable Badge ===");
  await page.goto(`${BASE}/embed/${DEMO_CODE}`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Verified Authentic', { timeout: 10000 });
  await sleep(2500);

  // ═══ SCENE 23: Health API ═══
  console.log("=== Scene 23: Health API ===");
  await page.goto(`${BASE}/api/health`, { waitUntil: "networkidle" });
  await sleep(2500);

  // ═══ SCENE 24: Invalid Verification Code ═══
  console.log("=== Scene 24: Invalid Code ===");
  await page.goto(`${BASE}/verify/FAKE_COUNTERFEIT_123`, { waitUntil: "networkidle" });
  await sleep(3000);
  // Wait for failed result
  await page.waitForSelector('text=FAILED', { timeout: 15000 }).catch(() => {});
  await sleep(2000);

  // ═══ SCENE 25: Print-Ready QR (show print hint) ═══
  console.log("=== Scene 25: QR Certificate (Print Ready) ===");
  await page.goto(`${BASE}/qr/${DEMO_CODE}`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.waitForSelector('text=Luxe Watches', { timeout: 10000 });
  await sleep(1500);
  // Scroll to print note
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
  await sleep(1500);

  // ═══ SCENE 26: Final Landing ═══
  console.log("=== Scene 26: Final Landing ===");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(3000);

  console.log("=== Done — Closing ===");
  await page.close();
  await context.close();
  await browser.close();

  console.log("\nVideo saved to ./demo-video-full/");
}

record().catch((err) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
