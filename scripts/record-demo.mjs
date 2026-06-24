// Complete GenuProof demo — every feature, every page, every flow
// Target: 5-7 minutes, comprehensive walkthrough

import { chromium } from "playwright";

const BASE = "https://genuproof.com";
const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const PERFUME_CODE = "27dEHQymVRMl";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const SUNGLASSES_CODE = "IebJZgMHdD-h";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";
const BRAND_ID = "5019622c-9860-4b83-a5c6-adb82ebd0412";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scroll = (page, px) => page.evaluate((px) => window.scrollBy({ top: px, behavior: "smooth" }), px);
const scrollMain = (page, px) => page.evaluate((px) => {
  const m = document.querySelector("main"); if (m) m.scrollBy({ top: px, behavior: "smooth" }); else window.scrollBy({ top: px, behavior: "smooth" });
}, px);
const scrollTop = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));

async function record() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "./demo-video-complete", size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  page.on("dialog", async (d) => {
    if (d.type() === "prompt") await d.accept("Quality defect in manufacturing batch B-42");
    else await d.accept();
  });

  // ════════════════════════════════════════════
  // ACT 1: THE PLATFORM (Landing + Design)
  // ════════════════════════════════════════════

  console.log("ACT 1: Landing Page");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(3000);

  // Slow scroll through entire landing page
  console.log("  Scrolling through hero, stats, features, how-it-works, CTA");
  for (let i = 0; i < 6; i++) { await scroll(page, 400); await sleep(1500); }
  await scroll(page, 200); await sleep(1500);
  await scrollTop(page); await sleep(1500);

  // Dark mode
  console.log("  Dark mode toggle");
  const darkBtn = page.locator('button[title="Switch to dark mode"]');
  if (await darkBtn.isVisible()) {
    await darkBtn.click(); await sleep(2000);
    await scroll(page, 400); await sleep(1500);
    await scrollTop(page); await sleep(1000);
    const lightBtn = page.locator('button[title="Switch to light mode"]');
    if (await lightBtn.isVisible()) { await lightBtn.click(); await sleep(1500); }
  }

  // Mobile responsive
  console.log("  Mobile responsive");
  await page.setViewportSize({ width: 375, height: 812 }); await sleep(1200);
  const hamburger = page.locator("nav button.sm\\:hidden").first();
  if (await hamburger.isVisible()) { await hamburger.click(); await sleep(1500); await hamburger.click(); await sleep(600); }
  await scroll(page, 300); await sleep(1000);
  await page.setViewportSize({ width: 1440, height: 900 }); await sleep(1000);

  // ════════════════════════════════════════════
  // ACT 2: CONSUMER VERIFICATION FLOW
  // ════════════════════════════════════════════

  console.log("ACT 2: Consumer Verification");

  // Verify the watch
  console.log("  Verify Royal Oak Chronograph");
  await page.fill('input[placeholder="Verification code"]', WATCH_CODE); await sleep(800);
  await page.click('button:has-text("Verify")');
  await sleep(2500);
  try { await page.waitForSelector('text=AUTHENTIC', { timeout: 15000 }); } catch {}
  await sleep(2500);

  // Certificate + claim status
  console.log("  Certificate + claim status");
  await scroll(page, 300); await sleep(1500);
  await scroll(page, 300); await sleep(1500);

  // Crypto checks
  console.log("  Crypto verification checks");
  await scroll(page, 300); await sleep(1500);

  // Provenance chain
  console.log("  Provenance chain — expand events");
  await scroll(page, 200); await sleep(1000);
  const mfgBtn = page.locator('button:has-text("Manufactured")');
  if (await mfgBtn.isVisible()) { await mfgBtn.click(); await sleep(2500); await mfgBtn.click(); await sleep(500); }
  const shippedBtn = page.locator('button:has-text("Shipped")').first();
  if (await shippedBtn.isVisible()) { await shippedBtn.click(); await sleep(2000); await shippedBtn.click(); await sleep(500); }

  await scroll(page, 400); await sleep(1500);

  // Action bar: share, export, QR, details
  console.log("  Action bar — Share, Export, QR, Details");
  await scroll(page, 300); await sleep(1000);
  const shareBtn = page.locator('button:has-text("Share result")');
  if (await shareBtn.isVisible()) { await shareBtn.click(); await sleep(1500); }
  const exportBtn = page.locator('a:has-text("Export JSON")').first();
  if (await exportBtn.isVisible()) { await exportBtn.hover(); await sleep(1000); }

  // ════════════════════════════════════════════
  // ACT 3: VERIFY ANOTHER PRODUCT
  // ════════════════════════════════════════════

  console.log("ACT 3: Verify Handbag");
  await page.goto(`${BASE}/verify/${HANDBAG_CODE}`, { waitUntil: "networkidle" });
  await sleep(2500);
  try { await page.waitForSelector('text=AUTHENTIC', { timeout: 15000 }); } catch {}
  await sleep(2000);

  // Claim this product
  console.log("  Claim product flow");
  await scroll(page, 300); await sleep(1000);
  const claimBtn = page.locator('button:has-text("Claim Product")');
  if (await claimBtn.isVisible()) { await claimBtn.click(); await sleep(2500); }
  await scroll(page, 300); await sleep(1500);

  // ════════════════════════════════════════════
  // ACT 4: INVALID CODE (COUNTERFEIT)
  // ════════════════════════════════════════════

  console.log("ACT 4: Invalid/counterfeit code");
  await page.goto(`${BASE}/verify/COUNTERFEIT_CLONED_TAG`, { waitUntil: "networkidle" });
  await sleep(3500);
  try { await page.waitForSelector('text=FAILED', { timeout: 12000 }); } catch {}
  await sleep(2500);

  // ════════════════════════════════════════════
  // ACT 5: QR CERTIFICATE
  // ════════════════════════════════════════════

  console.log("ACT 5: QR Certificate pages");
  await page.goto(`${BASE}/qr/${WATCH_CODE}`, { waitUntil: "networkidle" });
  await sleep(1000);
  try { await page.waitForSelector('text=Luxe Watches', { timeout: 8000 }); } catch {}
  await sleep(2500);
  await scroll(page, 400); await sleep(1500);

  // Second QR certificate
  await page.goto(`${BASE}/qr/${PERFUME_CODE}`, { waitUntil: "networkidle" });
  await sleep(1000);
  try { await page.waitForSelector('text=Certificate', { timeout: 8000 }); } catch {}
  await sleep(2500);

  // ════════════════════════════════════════════
  // ACT 6: PRODUCT DETAIL + SCAN HISTORY
  // ════════════════════════════════════════════

  console.log("ACT 6: Product detail page");
  await page.goto(`${BASE}/product/${WATCH_PRODUCT_ID}`, { waitUntil: "networkidle" });
  await sleep(1000);
  try { await page.waitForSelector('text=Royal Oak', { timeout: 8000 }); } catch {}
  await sleep(2000);

  // Scroll through info grid
  console.log("  Info grid + crypto identity");
  await scroll(page, 400); await sleep(1500);

  // QR + actions
  console.log("  QR + quick actions");
  await scroll(page, 400); await sleep(1500);

  // Scan history
  console.log("  Expand scan history");
  await scroll(page, 200); await sleep(800);
  const scanBtn = page.locator('button:has-text("Scan History")');
  if (await scanBtn.isVisible()) { await scanBtn.click(); await sleep(2500); }

  // Provenance
  await scroll(page, 400); await sleep(2000);

  // ════════════════════════════════════════════
  // ACT 7: BRAND DASHBOARD
  // ════════════════════════════════════════════

  console.log("ACT 7: Dashboard — Brand Selector");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(1000);
  try { await page.waitForSelector('text=Existing Brands', { timeout: 8000 }); } catch {}
  await sleep(2500);

  // Select Luxe Watches
  await page.click('button:has-text("Luxe Watches")');
  await sleep(2500);

  // Overview tab
  console.log("  Overview — stats + live threat feed + activity");
  try { await page.waitForSelector('text=Live Threat Feed', { timeout: 8000 }); } catch {}
  await sleep(2500);
  await scrollMain(page, 400); await sleep(1500);
  await scrollMain(page, 400); await sleep(1500);
  await scrollMain(page, 400); await sleep(1500);

  // Products tab
  console.log("  Products tab — status badges + actions");
  await scrollMain(page, -3000); await sleep(300);
  await page.click('button:has-text("Products")'); await sleep(2000);
  await scrollMain(page, 200); await sleep(1500);

  // Hover recall and transfer
  console.log("  Hover Recall + Transfer buttons");
  const recallBtn = page.locator('button:has-text("Recall")').first();
  if (await recallBtn.isVisible()) { await recallBtn.hover(); await sleep(1500); }
  const transferBtn = page.locator('button:has-text("Transfer")').first();
  if (await transferBtn.isVisible()) { await transferBtn.hover(); await sleep(1500); }

  // Register tab
  console.log("  Register new product");
  await scrollMain(page, -3000); await sleep(300);
  await page.click('button:has-text("Register")'); await sleep(1000);

  // Fill product form using dropdowns
  await page.fill('input[placeholder="e.g. Classic Chronograph 42mm"]', "Monaco Racing Chronograph");
  await sleep(400);
  await page.fill('input[placeholder="LW-CC-42"]', "LW-MRC-39");
  await sleep(400);

  // Select category dropdown
  const catSelect = page.locator('select').nth(0);
  // Find the category select specifically
  const categorySelects = page.locator('select');
  const allSelects = await categorySelects.all();
  for (const sel of allSelects) {
    const options = await sel.locator('option').allTextContents();
    if (options.includes("Watches")) {
      await sel.selectOption("Watches"); await sleep(500);
      break;
    }
  }

  // Select manufacturing location
  for (const sel of allSelects) {
    const options = await sel.locator('option').allTextContents();
    if (options.includes("Geneva, Switzerland")) {
      await sel.selectOption("Le Locle, Switzerland"); await sleep(500);
      break;
    }
  }

  await page.click('button:has-text("Register Product")'); await sleep(2500);

  // Supply Chain tab
  console.log("  Supply Chain — dropdowns for actor + location");
  await page.click('button:has-text("Supply Chain")'); await sleep(1500);

  // Threats tab
  console.log("  Threats tab");
  await page.click('button:has-text("Threats")'); await sleep(2500);

  // ════════════════════════════════════════════
  // ACT 8: EXPLORE GALLERY
  // ════════════════════════════════════════════

  console.log("ACT 8: Explore Gallery");
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await sleep(1000);
  try { await page.waitForSelector('text=products registered', { timeout: 8000 }); } catch {}
  await sleep(2000);

  // Category filters
  console.log("  Category filters");
  const filters = ["Watches", "Handbags", "Fragrances", "Eyewear", "All"];
  for (const f of filters) {
    const btn = page.locator(`button:has-text("${f}")`);
    if (await btn.isVisible()) { await btn.click(); await sleep(1200); }
  }

  // ════════════════════════════════════════════
  // ACT 9: COMPARE PRODUCTS
  // ════════════════════════════════════════════

  console.log("ACT 9: Compare products");
  await page.goto(`${BASE}/compare`, { waitUntil: "networkidle" }); await sleep(1500);
  await page.fill('input[placeholder="First verification code"]', WATCH_CODE); await sleep(400);
  await page.fill('input[placeholder="Second verification code"]', NAUTILUS_CODE); await sleep(400);
  await page.click('button:has-text("Compare")');
  await sleep(1000);
  try { await page.waitForSelector('text=Royal Oak', { timeout: 8000 }); } catch {}
  await sleep(2500);
  await scroll(page, 300); await sleep(1500);

  // ════════════════════════════════════════════
  // ACT 10: ANALYTICS
  // ════════════════════════════════════════════

  console.log("ACT 10: Analytics dashboard");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" }); await sleep(1000);
  try { await page.waitForSelector('text=Total Products', { timeout: 8000 }); } catch {}
  await sleep(2500);
  await scroll(page, 400); await sleep(2000);

  // ════════════════════════════════════════════
  // ACT 11: INTEGRATIONS + SIMULATION
  // ════════════════════════════════════════════

  console.log("ACT 11: Integrations page");
  await page.goto(`${BASE}/integrations`, { waitUntil: "networkidle" }); await sleep(1000);
  try { await page.waitForSelector('text=How It Works', { timeout: 8000 }); } catch {}
  await sleep(2000);

  // Architecture diagram
  await scroll(page, 300); await sleep(1500);

  // Switch integration tabs
  console.log("  Integration tabs — Shipping, POS, Warehouse");
  const posTab = page.locator('button:has-text("Point of Sale")');
  if (await posTab.isVisible()) { await posTab.click(); await sleep(1500); }
  const wmsTab = page.locator('button:has-text("Warehouse")');
  if (await wmsTab.isVisible()) { await wmsTab.click(); await sleep(1500); }
  const shipTab = page.locator('button:has-text("Shipping")');
  if (await shipTab.isVisible()) { await shipTab.click(); await sleep(1000); }

  // Send test event
  console.log("  Send test shipping event");
  const testBtn = page.locator('button:has-text("Send Test Event")');
  if (await testBtn.isVisible()) { await testBtn.click(); await sleep(3000); }

  // Scroll to simulation
  console.log("  Supply chain simulation");
  await scroll(page, 600); await sleep(1500);

  // Run simulation
  await scroll(page, 300); await sleep(1000);

  // Select brand
  const brandSelect = page.locator('select').first();
  if (await brandSelect.isVisible()) {
    await brandSelect.click(); await sleep(500);
    await brandSelect.selectOption({ index: 1 }); await sleep(800);
  }

  // Select product from dropdown
  const productSelect = page.locator('select').nth(1);
  if (await productSelect.isVisible()) {
    await productSelect.selectOption("Speedmaster Professional"); await sleep(800);
  }

  // Select journey
  const fashionRadio = page.locator('text=Fashion Handbag');
  if (await fashionRadio.isVisible()) { await fashionRadio.click(); await sleep(800); }

  // Click luxury watch radio instead
  const watchRadio = page.locator('text=Luxury Watch');
  if (await watchRadio.isVisible()) { await watchRadio.click(); await sleep(800); }

  // Run simulation
  const simBtn = page.locator('button:has-text("Run Simulation")');
  if (await simBtn.isVisible()) { await simBtn.click(); await sleep(4000); }

  // Scroll to see results
  await scroll(page, 300); await sleep(2000);

  // ════════════════════════════════════════════
  // ACT 12: STATUS PAGE
  // ════════════════════════════════════════════

  console.log("ACT 12: Status page");
  await page.goto(`${BASE}/status`, { waitUntil: "networkidle" }); await sleep(1000);
  try { await page.waitForSelector('text=Operational', { timeout: 12000 }); } catch {}
  await sleep(2500);
  await scroll(page, 300); await sleep(1500);

  // ════════════════════════════════════════════
  // ACT 13: API DOCS
  // ════════════════════════════════════════════

  console.log("ACT 13: API documentation");
  await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" }); await sleep(2000);
  // Scroll through all endpoints
  for (let i = 0; i < 5; i++) { await scroll(page, 500); await sleep(1200); }
  // Scroll to crypto design section
  await scroll(page, 500); await sleep(2000);

  // ════════════════════════════════════════════
  // ACT 14: EMBEDDABLE WIDGET
  // ════════════════════════════════════════════

  console.log("ACT 14: Embeddable badge");
  await page.goto(`${BASE}/embed/${WATCH_CODE}`, { waitUntil: "networkidle" }); await sleep(1000);
  try { await page.waitForSelector('text=Verified Authentic', { timeout: 8000 }); } catch {}
  await sleep(2500);

  // ════════════════════════════════════════════
  // ACT 15: RAW API ENDPOINTS
  // ════════════════════════════════════════════

  console.log("ACT 15: Raw API responses");

  // Health
  console.log("  Health API");
  await page.goto(`${BASE}/api/health`, { waitUntil: "networkidle" }); await sleep(2500);

  // Catalog categories
  console.log("  Catalog categories API");
  await page.goto(`${BASE}/api/catalog/categories`, { waitUntil: "networkidle" }); await sleep(2000);

  // Catalog actors
  console.log("  Catalog actors API");
  await page.goto(`${BASE}/api/catalog/actors?type=carriers`, { waitUntil: "networkidle" }); await sleep(2000);

  // Journey templates
  console.log("  Journey templates API");
  await page.goto(`${BASE}/api/integrations/journeys`, { waitUntil: "networkidle" }); await sleep(2000);

  // ════════════════════════════════════════════
  // ACT 16: VERIFY PAGE (standalone)
  // ════════════════════════════════════════════

  console.log("ACT 16: Verify landing page");
  await page.goto(`${BASE}/verify`, { waitUntil: "networkidle" }); await sleep(2500);

  // ════════════════════════════════════════════
  // ACT 17: FINAL — BACK TO LANDING
  // ════════════════════════════════════════════

  console.log("ACT 17: Final landing");
  await page.goto(BASE, { waitUntil: "networkidle" }); await sleep(4000);

  // ════════════════════════════════════════════
  console.log("=== Recording complete ===");
  await page.close();
  await context.close();
  await browser.close();
  console.log("\nVideo saved to ./demo-video-complete/");
}

record().catch((err) => { console.error("Failed:", err); process.exit(1); });
