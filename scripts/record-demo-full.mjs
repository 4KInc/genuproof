// Authentik Full Demo — every page, every feature, every flow
// Target: 8-12 minutes, comprehensive showcase for XPRIZE submission
// Covers: Landing, Verification (5 products), Tag Cloning, Dashboard (all 5 tabs),
//         Pricing, Ops Log, Integrations + Simulation, Analytics, Explore, Compare,
//         MCP Server, API Docs, Status, Embeds, QR Certificates, Raw API, Dark Mode

import { chromium } from "playwright";

const BASE = "https://authentik-platform.vercel.app";
const WATCH_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const PERFUME_CODE = "27dEHQymVRMl";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const SUNGLASSES_CODE = "IebJZgMHdD-h";
const WATCH_PRODUCT_ID = "e084595c97320cfcc85309943f345760";
const BRAND_ID = "5019622c-9860-4b83-a5c6-adb82ebd0412";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scroll = (page, px) =>
  page.evaluate((px) => window.scrollBy({ top: px, behavior: "smooth" }), px);
const scrollMain = (page, px) =>
  page.evaluate((px) => {
    const m = document.querySelector("main");
    if (m) m.scrollBy({ top: px, behavior: "smooth" });
    else window.scrollBy({ top: px, behavior: "smooth" });
  }, px);
const scrollTop = (page) =>
  page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
const scrollToBottom = (page) =>
  page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));

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
  page.on("dialog", async (d) => {
    if (d.type() === "prompt")
      await d.accept("Quality defect in manufacturing batch B-42");
    else await d.accept();
  });

  // ════════════════════════════════════════════════════════════════════
  // ACT 1: LANDING PAGE — Hero, features, design, dark mode, mobile
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 1: Landing Page");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(3500);

  // Slow scroll through entire landing page
  console.log("  Hero → Stats → Features → How-It-Works → CTA");
  for (let i = 0; i < 8; i++) {
    await scroll(page, 350);
    await sleep(1500);
  }
  await scrollTop(page);
  await sleep(1500);

  // Dark mode toggle
  console.log("  Dark mode");
  const darkBtn = page.locator('button[title="Switch to dark mode"]');
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    await sleep(2500);
    await scroll(page, 500);
    await sleep(1500);
    await scroll(page, 500);
    await sleep(1500);
    await scrollTop(page);
    await sleep(1000);
    const lightBtn = page.locator('button[title="Switch to light mode"]');
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      await sleep(1500);
    }
  }

  // Mobile responsive
  console.log("  Mobile responsive demo");
  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(1500);
  const hamburger = page.locator("nav button.sm\\:hidden").first();
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await sleep(2000);
    await hamburger.click();
    await sleep(800);
  }
  await scroll(page, 400);
  await sleep(1200);
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(1200);

  // ════════════════════════════════════════════════════════════════════
  // ACT 2: CONSUMER VERIFICATION — Watch (full flow with interactions)
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 2: Verify Royal Oak Chronograph");
  await page.fill('input[placeholder="Verification code"]', WATCH_CODE);
  await sleep(800);
  await page.click('button:has-text("Verify")');
  await sleep(2500);
  try {
    await page.waitForSelector("text=AUTHENTIC", { timeout: 15000 });
  } catch {}
  await sleep(3000);

  // Certificate of Authenticity
  console.log("  Certificate + cryptographic checks");
  await scroll(page, 350);
  await sleep(2000);
  await scroll(page, 350);
  await sleep(2000);

  // Crypto verification checks
  await scroll(page, 350);
  await sleep(2000);

  // Provenance chain — expand events
  console.log("  Provenance chain — expand Manufactured + Shipped");
  await scroll(page, 250);
  await sleep(1200);
  const mfgBtn = page.locator('button:has-text("Manufactured")');
  if (await mfgBtn.isVisible()) {
    await mfgBtn.click();
    await sleep(3000);
    await mfgBtn.click();
    await sleep(600);
  }
  const shippedBtn = page.locator('button:has-text("Shipped")').first();
  if (await shippedBtn.isVisible()) {
    await shippedBtn.click();
    await sleep(2500);
    await shippedBtn.click();
    await sleep(600);
  }
  const receivedBtn = page.locator('button:has-text("Received")').first();
  if (await receivedBtn.isVisible()) {
    await receivedBtn.click();
    await sleep(2500);
    await receivedBtn.click();
    await sleep(600);
  }
  await scroll(page, 400);
  await sleep(1500);

  // Action bar
  console.log("  Action bar — Share, Export JSON");
  await scroll(page, 300);
  await sleep(1000);
  const shareBtn = page.locator('button:has-text("Share result")');
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await sleep(2000);
  }

  // ════════════════════════════════════════════════════════════════════
  // ACT 3: VERIFY ALL OTHER PRODUCTS (rapid showcase of 4 products)
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 3: Verify Handbag");
  await page.goto(`${BASE}/verify/${HANDBAG_CODE}`, { waitUntil: "networkidle" });
  await sleep(2000);
  try { await page.waitForSelector("text=AUTHENTIC", { timeout: 15000 }); } catch {}
  await sleep(2500);
  await scroll(page, 400);
  await sleep(1500);

  // Claim product
  console.log("  Claim product");
  const claimBtn = page.locator('button:has-text("Claim Product")');
  if (await claimBtn.isVisible()) {
    await claimBtn.click();
    await sleep(3000);
  }
  await scroll(page, 300);
  await sleep(1500);

  console.log("ACT 3b: Verify Perfume");
  await page.goto(`${BASE}/verify/${PERFUME_CODE}`, { waitUntil: "networkidle" });
  await sleep(2000);
  try { await page.waitForSelector("text=AUTHENTIC", { timeout: 15000 }); } catch {}
  await sleep(2500);
  await scroll(page, 500);
  await sleep(1500);

  console.log("ACT 3c: Verify Nautilus");
  await page.goto(`${BASE}/verify/${NAUTILUS_CODE}`, { waitUntil: "networkidle" });
  await sleep(2000);
  try { await page.waitForSelector("text=AUTHENTIC", { timeout: 15000 }); } catch {}
  await sleep(2500);
  await scroll(page, 500);
  await sleep(1500);

  console.log("ACT 3d: Verify Sunglasses");
  await page.goto(`${BASE}/verify/${SUNGLASSES_CODE}`, { waitUntil: "networkidle" });
  await sleep(2000);
  try { await page.waitForSelector("text=AUTHENTIC", { timeout: 15000 }); } catch {}
  await sleep(2500);
  await scroll(page, 500);
  await sleep(1500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 4: COUNTERFEIT / INVALID CODE — shows failed verification
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 4: Invalid/counterfeit code");
  await page.goto(`${BASE}/verify/COUNTERFEIT_CLONED_TAG`, {
    waitUntil: "networkidle",
  });
  await sleep(3500);
  try { await page.waitForSelector("text=FAILED", { timeout: 12000 }); } catch {}
  await sleep(3000);
  await scroll(page, 300);
  await sleep(1500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 5: QR CERTIFICATES — printable branded certificates
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 5: QR Certificates");
  await page.goto(`${BASE}/qr/${WATCH_CODE}`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Luxe Watches", { timeout: 8000 }); } catch {}
  await sleep(3000);
  await scroll(page, 500);
  await sleep(2000);

  // Second certificate — different product
  console.log("  Perfume QR certificate");
  await page.goto(`${BASE}/qr/${PERFUME_CODE}`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Certificate", { timeout: 8000 }); } catch {}
  await sleep(3000);

  // Third certificate — Nautilus
  console.log("  Nautilus QR certificate");
  await page.goto(`${BASE}/qr/${NAUTILUS_CODE}`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Certificate", { timeout: 8000 }); } catch {}
  await sleep(3000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 6: PRODUCT DETAIL — full product view with crypto identity
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 6: Product detail page");
  await page.goto(`${BASE}/product/${WATCH_PRODUCT_ID}`, {
    waitUntil: "networkidle",
  });
  await sleep(1200);
  try { await page.waitForSelector("text=Royal Oak", { timeout: 8000 }); } catch {}
  await sleep(2500);

  console.log("  Info grid + crypto identity");
  await scroll(page, 400);
  await sleep(2000);

  console.log("  QR code + quick actions");
  await scroll(page, 400);
  await sleep(2000);

  // Scan history
  console.log("  Scan history");
  const scanBtn = page.locator('button:has-text("Scan History")');
  if (await scanBtn.isVisible()) {
    await scanBtn.click();
    await sleep(3000);
  }

  // Provenance chain
  await scroll(page, 400);
  await sleep(2000);
  await scroll(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 7: BRAND DASHBOARD — all 5 tabs
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 7: Dashboard — Brand Selector");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Existing Brands", { timeout: 8000 }); } catch {}
  await sleep(3000);

  // Select Luxe Watches
  console.log("  Select Luxe Watches brand");
  await page.click('button:has-text("Luxe Watches")');
  await sleep(3000);

  // --- Overview tab ---
  console.log("  Overview — stats + live threat feed + activity");
  try { await page.waitForSelector("text=Live Threat Feed", { timeout: 8000 }); } catch {}
  await sleep(3000);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);

  // --- Register tab ---
  console.log("  Register new product");
  await scrollMain(page, -5000);
  await sleep(300);
  await page.click('button:has-text("Register")');
  await sleep(1500);

  // Fill product form
  await page.fill(
    'input[placeholder="e.g. Classic Chronograph 42mm"]',
    "Monaco Racing Chronograph"
  );
  await sleep(500);
  await page.fill('input[placeholder="LW-CC-42"]', "LW-MRC-39");
  await sleep(500);

  // Select category dropdown
  const allSelects = await page.locator("select").all();
  for (const sel of allSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.includes("Watches")) {
      await sel.selectOption("Watches");
      await sleep(600);
      break;
    }
  }

  // Select manufacturing location
  for (const sel of allSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.includes("Geneva, Switzerland")) {
      await sel.selectOption("Le Locle, Switzerland");
      await sleep(600);
      break;
    }
  }

  // Description
  const descField = page.locator('textarea, input[placeholder*="escription"]').first();
  if (await descField.isVisible()) {
    await descField.fill("Limited edition racing chronograph with sapphire caseback");
    await sleep(500);
  }

  await page.click('button:has-text("Register Product")');
  await sleep(3500);
  await scrollMain(page, 300);
  await sleep(2000);

  // --- Products tab ---
  console.log("  Products tab — list, badges, actions");
  await scrollMain(page, -5000);
  await sleep(300);
  await page.click('button:has-text("Products")');
  await sleep(2500);
  await scrollMain(page, 300);
  await sleep(2000);

  // Hover recall and transfer buttons
  console.log("  Hover Recall + Transfer buttons");
  const recallBtn = page.locator('button:has-text("Recall")').first();
  if (await recallBtn.isVisible()) {
    await recallBtn.hover();
    await sleep(1500);
  }
  const transferBtn = page.locator('button:has-text("Transfer")').first();
  if (await transferBtn.isVisible()) {
    await transferBtn.hover();
    await sleep(1500);
  }

  // Click Verify on a product
  const verifyBtn = page.locator('a:has-text("Verify"), button:has-text("Verify")').first();
  if (await verifyBtn.isVisible()) {
    await verifyBtn.hover();
    await sleep(1500);
  }

  await scrollMain(page, 300);
  await sleep(1500);

  // --- Supply Chain tab ---
  console.log("  Supply Chain tab — add provenance event");
  await scrollMain(page, -5000);
  await sleep(300);
  await page.click('button:has-text("Supply Chain")');
  await sleep(2000);

  // Fill supply chain event form
  const eventSelects = await page.locator("select").all();
  // Select product
  for (const sel of eventSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.some((o) => o.includes("Royal Oak") || o.includes("Select product"))) {
      await sel.selectOption({ index: 1 });
      await sleep(600);
      break;
    }
  }

  // Select event type
  for (const sel of eventSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.includes("shipped") || options.includes("Shipped")) {
      try {
        await sel.selectOption("shipped");
      } catch {
        await sel.selectOption({ index: 2 });
      }
      await sleep(600);
      break;
    }
  }

  // Select actor
  for (const sel of eventSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.some((o) => o.includes("FedEx"))) {
      await sel.selectOption({ index: 1 });
      await sleep(600);
      break;
    }
  }

  // Select location
  for (const sel of eventSelects) {
    const options = await sel.locator("option").allTextContents();
    if (options.some((o) => o.includes("Memphis"))) {
      await sel.selectOption({ index: 1 });
      await sleep(600);
      break;
    }
  }

  await scrollMain(page, 200);
  await sleep(1000);

  const addEventBtn = page.locator('button:has-text("Add Event"), button:has-text("Add Provenance")').first();
  if (await addEventBtn.isVisible()) {
    await addEventBtn.click();
    await sleep(3000);
  }

  // --- Threats tab ---
  console.log("  Threats tab — live threat alerts");
  await scrollMain(page, -5000);
  await sleep(300);
  await page.click('button:has-text("Threats")');
  await sleep(3000);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 8: PRICING PAGE — Stripe tiers
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 8: Pricing page");
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  await sleep(1500);
  try { await page.waitForSelector('text=$99', { timeout: 8000 }); } catch {}
  await sleep(3000);
  await scroll(page, 400);
  await sleep(2000);
  await scroll(page, 400);
  await sleep(2000);

  // Hover over the Brand plan CTA
  const brandPlanBtn = page.locator('button:has-text("Start Brand Plan"), a:has-text("Start Brand Plan")').first();
  if (await brandPlanBtn.isVisible()) {
    await brandPlanBtn.hover();
    await sleep(1500);
  }

  // Hover over the Business plan CTA
  const bizPlanBtn = page.locator('button:has-text("Start Business"), a:has-text("Start Business")').first();
  if (await bizPlanBtn.isVisible()) {
    await bizPlanBtn.hover();
    await sleep(1500);
  }

  // ════════════════════════════════════════════════════════════════════
  // ACT 9: OPS LOG — Gemini AI operations dashboard
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 9: Gemini AI Ops Log");
  await page.goto(`${BASE}/ops-log`, { waitUntil: "networkidle" });
  await sleep(1500);
  try { await page.waitForSelector("text=Gemini", { timeout: 10000 }); } catch {}
  await sleep(3500);
  await scroll(page, 400);
  await sleep(2500);
  await scroll(page, 400);
  await sleep(2500);
  await scroll(page, 400);
  await sleep(2500);
  await scroll(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 10: INTEGRATIONS — Shipping, POS, Warehouse + Simulation
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 10: Integrations page");
  await page.goto(`${BASE}/integrations`, { waitUntil: "networkidle" });
  await sleep(1500);
  try { await page.waitForSelector("text=How It Works", { timeout: 8000 }); } catch {}
  await sleep(2500);

  // Architecture diagram
  await scroll(page, 350);
  await sleep(2000);

  // Switch tabs
  console.log("  Shipping tab");
  const shipTab = page.locator('button:has-text("Shipping")');
  if (await shipTab.isVisible()) {
    await shipTab.click();
    await sleep(2000);
  }

  console.log("  POS tab");
  const posTab = page.locator('button:has-text("Point of Sale")');
  if (await posTab.isVisible()) {
    await posTab.click();
    await sleep(2000);
  }

  console.log("  Warehouse tab");
  const wmsTab = page.locator('button:has-text("Warehouse")');
  if (await wmsTab.isVisible()) {
    await wmsTab.click();
    await sleep(2000);
  }

  // Back to Shipping and send test event
  if (await shipTab.isVisible()) {
    await shipTab.click();
    await sleep(1000);
  }
  console.log("  Send test shipping event");
  const testBtn = page.locator('button:has-text("Send Test Event")');
  if (await testBtn.isVisible()) {
    await testBtn.click();
    await sleep(3500);
  }

  // Scroll to simulation
  console.log("  Supply chain simulation panel");
  await scroll(page, 600);
  await sleep(1500);
  await scroll(page, 400);
  await sleep(1500);

  // Select brand
  try {
    const simSelects = await page.locator("select").all();
    if (simSelects.length > 0) {
      const opts = await simSelects[0].locator("option").allTextContents();
      if (opts.length > 1) {
        await simSelects[0].selectOption({ index: 1 });
        await sleep(1000);
      }
    }

    // Select product (may appear after brand selection)
    await sleep(500);
    const simSelects2 = await page.locator("select").all();
    if (simSelects2.length > 1) {
      const opts2 = await simSelects2[1].locator("option").allTextContents();
      if (opts2.length > 1) {
        await simSelects2[1].selectOption({ index: 1 });
        await sleep(800);
      }
    }
  } catch { /* simulation selects optional */ }

  // Select journey templates — show all 4
  console.log("  Journey templates — Luxury Watch, Fashion Handbag, Pharma, Electronics");
  const journeyLabels = [
    "Fashion Handbag",
    "Pharmaceutical",
    "Electronics",
    "Luxury Watch",
  ];
  for (const label of journeyLabels) {
    const radio = page.locator(`text=${label}`);
    if (await radio.isVisible()) {
      await radio.click();
      await sleep(1000);
    }
  }

  // Run simulation (button may be disabled if form incomplete)
  const simBtn = page.locator('button:has-text("Run Simulation")');
  try {
    if (await simBtn.isVisible() && await simBtn.isEnabled({ timeout: 3000 })) {
      await simBtn.click();
      await sleep(5000);
      // Scroll through results
      await scroll(page, 400);
      await sleep(2000);
      await scroll(page, 400);
      await sleep(2000);
    } else {
      console.log("  (Simulation button disabled — skipping run, scrolling through UI)");
      await scroll(page, 400);
      await sleep(2000);
    }
  } catch {
    console.log("  (Simulation skipped — form incomplete)");
    await scroll(page, 400);
    await sleep(2000);
  }

  // ════════════════════════════════════════════════════════════════════
  // ACT 11: EXPLORE GALLERY — category filters
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 11: Explore Gallery");
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=products registered", { timeout: 8000 }); } catch {}
  await sleep(2500);

  // Category filters
  console.log("  Category filters");
  const filters = ["Watches", "Handbags", "Fragrances", "Eyewear", "All"];
  for (const f of filters) {
    const btn = page.locator(`button:has-text("${f}")`);
    if (await btn.isVisible()) {
      await btn.click();
      await sleep(1200);
    }
  }
  await scroll(page, 300);
  await sleep(1500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 12: COMPARE PRODUCTS — side by side verification
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 12: Compare products");
  await page.goto(`${BASE}/compare`, { waitUntil: "networkidle" });
  await sleep(1500);
  await page.fill('input[placeholder="First verification code"]', WATCH_CODE);
  await sleep(500);
  await page.fill('input[placeholder="Second verification code"]', NAUTILUS_CODE);
  await sleep(500);
  await page.click('button:has-text("Compare")');
  await sleep(1200);
  try { await page.waitForSelector("text=Royal Oak", { timeout: 8000 }); } catch {}
  await sleep(3000);
  await scroll(page, 400);
  await sleep(2000);
  await scroll(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 13: ANALYTICS DASHBOARD
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 13: Analytics dashboard");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Total Products", { timeout: 8000 }); } catch {}
  await sleep(3000);
  await scroll(page, 400);
  await sleep(2000);
  await scroll(page, 400);
  await sleep(2000);
  await scroll(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 14: MCP SERVER DOCUMENTATION
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 14: MCP Server page");
  await page.goto(`${BASE}/mcp`, { waitUntil: "networkidle" });
  await sleep(1500);
  try { await page.waitForSelector("text=MCP", { timeout: 8000 }); } catch {}
  await sleep(3000);

  // Quick Start
  await scroll(page, 400);
  await sleep(2000);

  // Configuration tabs
  console.log("  Configuration tabs — Claude Code, Desktop, Cursor, Custom");
  const configTabs = ["Claude Desktop", "Cursor", "Custom Client", "Claude Code"];
  for (const tab of configTabs) {
    const btn = page.locator(`button:has-text("${tab}")`);
    if (await btn.isVisible()) {
      await btn.click();
      await sleep(1500);
    }
  }

  // Example conversations
  await scroll(page, 500);
  await sleep(2000);

  // Tools reference — expand categories
  console.log("  Tools reference — expand categories");
  await scroll(page, 400);
  await sleep(1500);

  const categories = [
    "Products",
    "Threats & AI",
    "Integrations",
    "Webhook Ingestion",
    "Catalog",
    "Stripe",
    "Platform",
    "Brands",
  ];
  for (const cat of categories) {
    const catBtn = page.locator(`button:has-text("${cat}")`).first();
    if (await catBtn.isVisible()) {
      await catBtn.click();
      await sleep(1800);
      await scroll(page, 200);
      await sleep(800);
    }
  }

  // Architecture
  await scroll(page, 400);
  await sleep(2000);

  // Environment variables
  await scroll(page, 300);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 15: API DOCUMENTATION
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 15: API documentation");
  await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });
  await sleep(2500);
  // Scroll through all endpoints
  for (let i = 0; i < 7; i++) {
    await scroll(page, 500);
    await sleep(1200);
  }
  // Crypto design section
  await scroll(page, 500);
  await sleep(2500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 16: STATUS PAGE — live system health
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 16: Status page");
  await page.goto(`${BASE}/status`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Operational", { timeout: 12000 }); } catch {}
  await sleep(3000);
  await scroll(page, 400);
  await sleep(2000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 17: EMBEDDABLE WIDGET — iframe-ready verification badge
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 17: Embeddable badge");
  await page.goto(`${BASE}/embed/${WATCH_CODE}`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Verified Authentic", { timeout: 8000 }); } catch {}
  await sleep(3000);

  // Second embed
  await page.goto(`${BASE}/embed/${HANDBAG_CODE}`, { waitUntil: "networkidle" });
  await sleep(1200);
  try { await page.waitForSelector("text=Verified", { timeout: 8000 }); } catch {}
  await sleep(2500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 18: RAW API ENDPOINTS — JSON responses
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 18: Raw API responses");

  console.log("  Health API");
  await page.goto(`${BASE}/api/health`, { waitUntil: "networkidle" });
  await sleep(3000);

  console.log("  Verify API");
  await page.goto(`${BASE}/api/products/verify?code=${WATCH_CODE}`, {
    waitUntil: "networkidle",
  });
  await sleep(3000);
  await scroll(page, 400);
  await sleep(1500);

  console.log("  DPP Export API (download)");
  try {
    await page.goto(`${BASE}/api/products/dpp-export?code=${WATCH_CODE}`, {
      waitUntil: "networkidle",
      timeout: 5000,
    });
    await sleep(2000);
  } catch {
    // DPP export triggers file download — expected
    console.log("  (DPP download triggered — continuing)");
    await sleep(2000);
  }

  console.log("  Catalog categories API");
  await page.goto(`${BASE}/api/catalog/categories`, {
    waitUntil: "networkidle",
  });
  await sleep(2500);

  console.log("  Catalog actors (carriers) API");
  await page.goto(`${BASE}/api/catalog/actors?type=carriers`, {
    waitUntil: "networkidle",
  });
  await sleep(2500);

  console.log("  Ops Log API");
  await page.goto(`${BASE}/api/ops-log?limit=5`, {
    waitUntil: "networkidle",
  });
  await sleep(3000);
  await scroll(page, 400);
  await sleep(1500);

  console.log("  Journey templates API");
  await page.goto(`${BASE}/api/integrations/journeys`, {
    waitUntil: "networkidle",
  });
  await sleep(2500);

  // ════════════════════════════════════════════════════════════════════
  // ACT 19: VERIFY LANDING PAGE (standalone entry point)
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 19: Verify landing page");
  await page.goto(`${BASE}/verify`, { waitUntil: "networkidle" });
  await sleep(3000);

  // ════════════════════════════════════════════════════════════════════
  // ACT 20: FINAL — Back to landing with slow scroll
  // ════════════════════════════════════════════════════════════════════

  console.log("ACT 20: Final landing");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(2000);
  await scroll(page, 300);
  await sleep(1500);
  await scroll(page, 300);
  await sleep(1500);
  await scrollTop(page);
  await sleep(4000);

  // ════════════════════════════════════════════════════════════════════
  console.log("=== Recording complete ===");
  await page.close();
  await context.close();
  await browser.close();
  console.log("\nVideo saved to ./demo-video-full/");
}

record().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
