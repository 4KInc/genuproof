import { chromium } from "playwright";

async function testPayment() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("1. Creating Stripe checkout session...");
  const res = await fetch("https://genuproof.com/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "brand", email: "demo@authentik-platform.com" }),
  });
  const { url } = await res.json();

  console.log("2. Loading Stripe checkout...");
  await page.goto(url, { timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log("3. Filling card details...");
  await page.locator('#cardNumber').fill('4242424242424242');
  await page.waitForTimeout(300);
  await page.locator('#cardExpiry').fill('1227');
  await page.waitForTimeout(300);
  await page.locator('#cardCvc').fill('123');
  await page.waitForTimeout(300);
  await page.locator('#billingName').fill('Authentik Demo');
  await page.waitForTimeout(300);

  // Uncheck "Save my information" to skip phone number requirement
  const saveCheckbox = page.locator('#enableStripePass');
  if (await saveCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (await saveCheckbox.isChecked()) {
      await saveCheckbox.uncheck();
      await page.waitForTimeout(500);
    }
  }

  // ZIP code
  const zip = page.locator('#billingPostalCode');
  if (await zip.isVisible({ timeout: 1000 }).catch(() => false)) {
    await zip.fill('10001');
    await page.waitForTimeout(300);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "./screenshots/stripe-filled-final.png", fullPage: true });
  console.log("4. Form filled screenshot saved");

  console.log("5. Clicking Subscribe...");
  await page.locator('.SubmitButton').click();
  console.log("6. Processing payment...");

  // Wait for redirect back to Authentik
  try {
    await page.waitForURL(/authentik-platform/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "./screenshots/stripe-success.png", fullPage: true });
    console.log("7. SUCCESS! Redirected to:", page.url());
  } catch {
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "./screenshots/stripe-result.png", fullPage: true });
    console.log("7. Current URL:", page.url());
  }

  await browser.close();
}

testPayment().catch(err => { console.error("Error:", err.message); process.exit(1); });
