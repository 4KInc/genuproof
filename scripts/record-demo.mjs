// Full feature demo video — every feature demonstrated including anti-cloning

import { chromium } from "playwright";

const BASE = "https://authentik-platform.vercel.app";
const DEMO_CODE = "wfPHybaFV3_a";
const HANDBAG_CODE = "pOszdB-1n6IC";
const NAUTILUS_CODE = "FshGQLRNsr4p";
const PRODUCT_ID = "e084595c97320cfcc85309943f345760";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper: smooth scroll main content in dashboard
const scrollMain = (page, px) =>
  page.evaluate((px) => {
    const el = document.querySelector("main");
    if (el) el.scrollBy({ top: px, behavior: "smooth" });
    else window.scrollBy({ top: px, behavior: "smooth" });
  }, px);

async function record() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "./demo-video-final", size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  // Auto-dismiss dialogs (alert/prompt)
  page.on("dialog", async (d) => {
    if (d.type() === "prompt") await d.accept("Safety defect found in batch");
    else await d.accept();
  });

  // ═══ ACT 1: THE PLATFORM ═══

  console.log("Scene 1 — Landing page");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(2500);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
    await sleep(1300);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1200);

  console.log("Scene 2 — Dark mode toggle");
  const darkBtn = page.locator('button[title="Switch to dark mode"]');
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    await sleep(1800);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await sleep(1200);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(800);
    const lightBtn = page.locator('button[title="Switch to light mode"]');
    if (await lightBtn.isVisible()) { await lightBtn.click(); await sleep(1200); }
  }

  console.log("Scene 3 — Mobile responsive");
  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(1200);
  const hamburger = page.locator("nav button.sm\\:hidden").first();
  if (await hamburger.isVisible()) { await hamburger.click(); await sleep(1200); await hamburger.click(); await sleep(600); }
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(800);

  // ═══ ACT 2: CONSUMER VERIFICATION ═══

  console.log("Scene 4 — Verify product");
  await page.fill('input[placeholder="Verification code"]', DEMO_CODE);
  await sleep(700);
  await page.click('button:has-text("Verify")');
  await sleep(2200);
  await page.waitForSelector('text=AUTHENTIC', { timeout: 15000 });
  await sleep(2000);

  // Scroll through certificate
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
  await sleep(1200);

  console.log("Scene 5 — Claim status (already claimed)");
  // Product was claimed earlier — should show "Previously Registered" or "Your Product"
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: "smooth" }));
  await sleep(2000);

  // Scroll to crypto checks
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1200);

  console.log("Scene 6 — Provenance chain expand");
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: "smooth" }));
  await sleep(800);
  const mfgBtn = page.locator('button:has-text("Manufactured")');
  if (await mfgBtn.isVisible()) { await mfgBtn.click(); await sleep(2000); await mfgBtn.click(); await sleep(500); }

  // Scroll to action bar
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(1200);

  console.log("Scene 7 — Share & Export actions");
  const shareBtn = page.locator('button:has-text("Share result")');
  if (await shareBtn.isVisible()) { await shareBtn.click(); await sleep(1200); }
  const exportBtn = page.locator('a:has-text("Export JSON")').first();
  if (await exportBtn.isVisible()) { await exportBtn.hover(); await sleep(1000); }

  // ═══ ACT 3: QR & PRODUCT DETAIL ═══

  console.log("Scene 8 — QR Certificate");
  await page.goto(`${BASE}/qr/${HANDBAG_CODE}`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Luxe Watches', { timeout: 8000 }); } catch {}
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1500);

  console.log("Scene 9 — Product detail + scan history");
  await page.goto(`${BASE}/product/${PRODUCT_ID}`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Royal Oak', { timeout: 8000 }); } catch {}
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1200);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1000);
  // Expand scan history
  const scanBtn = page.locator('button:has-text("Scan History")');
  if (await scanBtn.isVisible()) { await scanBtn.click(); await sleep(2000); }
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1500);

  // ═══ ACT 4: BRAND DASHBOARD ═══

  console.log("Scene 10 — Brand selector");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Existing Brands', { timeout: 8000 }); } catch {}
  await sleep(1800);
  await page.click('button:has-text("Luxe Watches")');
  await sleep(2500);

  console.log("Scene 11 — Overview + live threat feed + activity");
  try { await page.waitForSelector('text=Live Threat Feed', { timeout: 8000 }); } catch {}
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(1500);
  await scrollMain(page, 400);
  await sleep(1500);

  console.log("Scene 12 — Products tab with actions");
  await scrollMain(page, -2000);
  await sleep(300);
  await page.click('button:has-text("Products")');
  await sleep(2000);
  await scrollMain(page, 200);
  await sleep(1200);

  // Hover Recall and Transfer buttons
  const recallBtn = page.locator('button:has-text("Recall")').first();
  if (await recallBtn.isVisible()) { await recallBtn.hover(); await sleep(1200); }
  const transferBtn = page.locator('button:has-text("Transfer")').first();
  if (await transferBtn.isVisible()) { await transferBtn.hover(); await sleep(1200); }

  // Click JSON export
  const jsonBtn = page.locator('a:has-text("JSON")').first();
  if (await jsonBtn.isVisible()) { await jsonBtn.hover(); await sleep(1000); }

  console.log("Scene 13 — Register new product");
  await scrollMain(page, -2000);
  await sleep(300);
  await page.click('button:has-text("Register")');
  await sleep(800);
  await page.fill('input[placeholder="e.g. Classic Chronograph 42mm"]', "Serpentine Gold Cuff Bracelet");
  await sleep(400);
  await page.fill('input[placeholder="LW-CC-42"]', "ME-SGC-18K");
  await sleep(400);
  await page.fill('input[placeholder="Watches"]', "Jewelry");
  await sleep(400);
  await page.fill('input[placeholder="Geneva, Switzerland"]', "Valenza, Italy");
  await sleep(600);
  await page.click('button:has-text("Register Product")');
  await sleep(2500);

  console.log("Scene 14 — Supply chain event");
  await page.click('button:has-text("Supply Chain")');
  await sleep(1500);

  console.log("Scene 15 — Threats tab");
  await page.click('button:has-text("Threats")');
  await sleep(2000);

  // ═══ ACT 5: ANTI-TAG-CLONING ═══

  console.log("Scene 16 — Verify unclaimed product (claim flow)");
  // Use the handbag which isn't claimed yet
  await page.goto(`${BASE}/verify/${HANDBAG_CODE}`, { waitUntil: "networkidle" });
  await sleep(2200);
  try { await page.waitForSelector('text=AUTHENTIC', { timeout: 15000 }); } catch {}
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1200);

  // Click claim button if visible
  const claimBtn = page.locator('button:has-text("Claim Product")');
  if (await claimBtn.isVisible()) {
    await claimBtn.click();
    await sleep(2500);
  }

  // ═══ ACT 6: EXPLORE & TOOLS ═══

  console.log("Scene 17 — Explore gallery + filters");
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=products registered', { timeout: 8000 }); } catch {}
  await sleep(1800);
  const watchF = page.locator('button:has-text("Watches")');
  if (await watchF.isVisible()) { await watchF.click(); await sleep(1200); }
  const fragF = page.locator('button:has-text("Fragrances")');
  if (await fragF.isVisible()) { await fragF.click(); await sleep(1200); }
  const allF = page.locator('button:has-text("All")');
  if (await allF.isVisible()) { await allF.click(); await sleep(1200); }

  console.log("Scene 18 — Compare products");
  await page.goto(`${BASE}/compare`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.fill('input[placeholder="First verification code"]', DEMO_CODE);
  await sleep(400);
  await page.fill('input[placeholder="Second verification code"]', NAUTILUS_CODE);
  await sleep(400);
  await page.click('button:has-text("Compare")');
  await sleep(1000);
  try { await page.waitForSelector('text=Royal Oak', { timeout: 8000 }); } catch {}
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1500);

  console.log("Scene 19 — Analytics");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Total Products', { timeout: 8000 }); } catch {}
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(1800);

  console.log("Scene 20 — Status page");
  await page.goto(`${BASE}/status`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Operational', { timeout: 10000 }); } catch {}
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await sleep(1500);

  console.log("Scene 21 — API docs");
  await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });
  await sleep(1500);
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
  await sleep(1200);
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
  await sleep(1200);

  console.log("Scene 22 — Embeddable badge");
  await page.goto(`${BASE}/embed/${DEMO_CODE}`, { waitUntil: "networkidle" });
  await sleep(800);
  try { await page.waitForSelector('text=Verified Authentic', { timeout: 8000 }); } catch {}
  await sleep(2000);

  console.log("Scene 23 — Health API");
  await page.goto(`${BASE}/api/health`, { waitUntil: "networkidle" });
  await sleep(2000);

  console.log("Scene 24 — Invalid code");
  await page.goto(`${BASE}/verify/COUNTERFEIT_FAKE_999`, { waitUntil: "networkidle" });
  await sleep(3000);
  try { await page.waitForSelector('text=FAILED', { timeout: 12000 }); } catch {}
  await sleep(2000);

  console.log("Scene 25 — Back to landing");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(3000);

  console.log("=== Done ===");
  await page.close();
  await context.close();
  await browser.close();
  console.log("\nVideo saved to ./demo-video-final/");
}

record().catch((err) => { console.error("Failed:", err); process.exit(1); });
