#!/usr/bin/env node

// Authentik MCP Server — wraps all 37 API endpoints as MCP tools
// Usage: node mcp/server.mjs
// Configure BASE_URL env var to point to your Authentik instance

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL =
  process.env.AUTHENTIK_BASE_URL ||
  process.env.BASE_URL ||
  "https://authentik-platform.vercel.app";

// ── Helpers ──────────────────────────────────────────────────────────

async function apiGet(path, params = {}) {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function apiPost(path, body = {}) {
  const res = await fetch(new URL(path, BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function apiDelete(path, body = {}) {
  const res = await fetch(new URL(path, BASE_URL), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

function toolResult(result) {
  return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
}

// ── Server ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: "authentik",
  version: "1.0.0",
});

// ── Brands ───────────────────────────────────────────────────────────

server.tool(
  "brands_create",
  "Register a new brand on the Authentik platform",
  { name: z.string(), domain: z.string(), industry: z.string(), logoUrl: z.string().optional() },
  async (args) => toolResult(await apiPost("/api/brands", args))
);

server.tool(
  "brands_get",
  "Get a brand profile by ID",
  { id: z.string().describe("Brand ID") },
  async ({ id }) => toolResult(await apiGet("/api/brands", { id }))
);

server.tool(
  "brands_list",
  "List all registered brands",
  {},
  async () => toolResult(await apiGet("/api/brands/list"))
);

server.tool(
  "brands_stats",
  "Get real-time statistics for a brand (product count, scans, threats)",
  { brandId: z.string() },
  async ({ brandId }) => toolResult(await apiGet("/api/brands/stats", { brandId }))
);

// ── Products ─────────────────────────────────────────────────────────

server.tool(
  "products_register",
  "Register a product with SHA-256 hash and HMAC-SHA256 signature",
  {
    brandId: z.string(),
    name: z.string(),
    sku: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  },
  async (args) => toolResult(await apiPost("/api/products/register", args))
);

server.tool(
  "products_batch",
  "Batch register up to 50 products at once",
  {
    brandId: z.string(),
    products: z.array(
      z.object({
        name: z.string(),
        sku: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        manufacturingLocation: z.string().optional(),
      })
    ),
  },
  async (args) => toolResult(await apiPost("/api/products/batch", args))
);

server.tool(
  "products_verify",
  "Verify a product's authenticity — checks SHA-256 hash, HMAC signature, and chain integrity. Also runs anomaly detection.",
  { code: z.string().optional().describe("Verification code"), productId: z.string().optional().describe("Product ID") },
  async (args) => toolResult(await apiGet("/api/products/verify", args))
);

server.tool(
  "products_list",
  "List products registered to a brand",
  { brandId: z.string(), limit: z.number().optional() },
  async (args) => toolResult(await apiGet("/api/products/list", args))
);

server.tool(
  "products_search",
  "Search for a product by verification code, product ID, or brand ID",
  { code: z.string().optional(), productId: z.string().optional(), brandId: z.string().optional() },
  async (args) => toolResult(await apiGet("/api/products/search", args))
);

server.tool(
  "products_events_add",
  "Add a hash-chained provenance event to a product's supply chain",
  {
    productId: z.string(),
    type: z.string().describe("Event type: manufactured, shipped, received, inspected, sold, transferred, recalled"),
    actor: z.string().describe("Who performed the action"),
    location: z.string().optional(),
    data: z.record(z.any()).optional(),
  },
  async (args) => toolResult(await apiPost("/api/products/events", args))
);

server.tool(
  "products_events_get",
  "Get the provenance event chain for a product",
  { productId: z.string() },
  async ({ productId }) => toolResult(await apiGet("/api/products/events", { productId }))
);

server.tool(
  "products_history",
  "Add the same provenance event to multiple products at once (max 50)",
  {
    productIds: z.array(z.string()),
    type: z.string(),
    actor: z.string(),
    location: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/products/history", args))
);

server.tool(
  "products_transfer",
  "Transfer product ownership with a chain-of-custody event",
  {
    productId: z.string(),
    newOwner: z.string(),
    location: z.string().optional(),
    reason: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/products/transfer", args))
);

server.tool(
  "products_recall",
  "Recall a product — creates critical threat alert",
  { productId: z.string(), reason: z.string(), issuedBy: z.string().optional() },
  async (args) => toolResult(await apiPost("/api/products/recall", args))
);

server.tool(
  "products_claim",
  "Consumer claims ownership of a product (locks to device fingerprint)",
  { productId: z.string(), consumerName: z.string().optional(), email: z.string().optional() },
  async (args) => toolResult(await apiPost("/api/products/claim", args))
);

server.tool(
  "products_claim_get",
  "Check if a product has been claimed by a consumer",
  { productId: z.string() },
  async ({ productId }) => toolResult(await apiGet("/api/products/claim", { productId }))
);

server.tool(
  "products_dispute",
  "File an ownership dispute against a claimed product",
  {
    productId: z.string(),
    consumerName: z.string().optional(),
    email: z.string().optional(),
    orderNumber: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/products/dispute", args))
);

server.tool(
  "products_dispute_get",
  "Get disputes filed against a product",
  { productId: z.string() },
  async ({ productId }) => toolResult(await apiGet("/api/products/dispute", { productId }))
);

server.tool(
  "products_certificate",
  "Export full cryptographic certificate for a product (JSON)",
  { code: z.string().optional(), productId: z.string().optional() },
  async (args) => toolResult(await apiGet("/api/products/certificate", args))
);

server.tool(
  "products_qr",
  "Generate QR code for a product (returns URL to QR image)",
  { code: z.string().optional(), productId: z.string().optional(), format: z.enum(["png", "svg"]).optional() },
  async (args) => {
    const url = new URL("/api/products/qr", BASE_URL);
    for (const [k, v] of Object.entries(args)) {
      if (v) url.searchParams.set(k, v);
    }
    return { content: [{ type: "text", text: `QR code URL: ${url.toString()}` }] };
  }
);

server.tool(
  "products_dpp_export",
  "Export EU Digital Product Passport (ESPR-2024/1781 compliant JSON)",
  { code: z.string().optional().describe("Verification code"), productId: z.string().optional() },
  async (args) => toolResult(await apiGet("/api/products/dpp-export", args))
);

// ── Webhook Ingestion ────────────────────────────────────────────────

server.tool(
  "ingest_shipping",
  "Ingest a shipping carrier webhook event (FedEx, DHL, UPS, USPS, Chronopost)",
  {
    trackingNumber: z.string(),
    carrier: z.string(),
    status: z.enum(["picked_up", "in_transit", "out_for_delivery", "delivered", "exception"]),
    productId: z.string().optional(),
    verificationCode: z.string().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/ingest/shipping", args))
);

server.tool(
  "ingest_pos",
  "Ingest a point-of-sale webhook event (Shopify, Square, WooCommerce, Stripe)",
  {
    orderId: z.string(),
    platform: z.string(),
    productId: z.string().optional(),
    verificationCode: z.string().optional(),
    sku: z.string().optional(),
    storeName: z.string().optional(),
    storeLocation: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/ingest/pos", args))
);

server.tool(
  "ingest_warehouse",
  "Ingest a warehouse management system webhook event",
  {
    action: z.enum(["received", "inspected", "stored", "dispatched", "returned"]),
    warehouseName: z.string(),
    productId: z.string().optional(),
    verificationCode: z.string().optional(),
    warehouseLocation: z.string().optional(),
    bay: z.string().optional(),
    inspectorId: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/ingest/warehouse", args))
);

// ── Integrations ─────────────────────────────────────────────────────

server.tool(
  "integrations_configure",
  "Configure a supply chain integration (generates ingest key and webhook URL)",
  {
    brandId: z.string(),
    type: z.enum(["fedex", "dhl", "ups", "shopify", "square", "woocommerce", "stripe", "wms_custom"]),
  },
  async (args) => toolResult(await apiPost("/api/integrations/configure", args))
);

server.tool(
  "integrations_list",
  "List configured integrations for a brand",
  { brandId: z.string() },
  async ({ brandId }) => toolResult(await apiGet("/api/integrations/configure", { brandId }))
);

server.tool(
  "integrations_simulate",
  "Run a supply chain simulation for a product through an industry journey",
  {
    brandId: z.string(),
    productName: z.string(),
    sku: z.string().optional(),
    category: z.string().optional(),
    journey: z.enum(["luxury_watch", "fashion_handbag", "pharmaceutical", "electronics", "custom"]),
  },
  async (args) => toolResult(await apiPost("/api/integrations/simulate", args))
);

server.tool(
  "integrations_status",
  "Get integration status and source breakdown for a brand",
  { brandId: z.string() },
  async ({ brandId }) => toolResult(await apiGet("/api/integrations/status", { brandId }))
);

server.tool(
  "integrations_journeys",
  "List available supply chain journey templates (luxury watch, fashion handbag, pharmaceutical, electronics)",
  {},
  async () => toolResult(await apiGet("/api/integrations/journeys"))
);

// ── Threat Intelligence & AI ─────────────────────────────────────────

server.tool(
  "threats_list",
  "Fetch threat alerts for a brand (geographic anomaly, burst scan, tag cloning, hash tampering)",
  { brandId: z.string(), limit: z.number().optional() },
  async (args) => toolResult(await apiGet("/api/threats", args))
);

server.tool(
  "ops_log",
  "Get the Gemini AI operations log — every threat classification call with agent, severity, confidence, latency",
  { limit: z.number().optional().describe("Number of entries (default 50)") },
  async ({ limit }) => toolResult(await apiGet("/api/ops-log", { limit }))
);

server.tool(
  "scans_list",
  "Get scan history for a product with location aggregation",
  { productId: z.string(), limit: z.number().optional() },
  async (args) => toolResult(await apiGet("/api/scans", args))
);

// ── Catalog ──────────────────────────────────────────────────────────

server.tool(
  "catalog_categories",
  "List all 14 product categories (watches, handbags, pharmaceuticals, etc.)",
  {},
  async () => toolResult(await apiGet("/api/catalog/categories"))
);

server.tool(
  "catalog_actors",
  "List supply chain actors — carriers, warehouses, inspection bodies, retailers (37 total)",
  { type: z.enum(["carriers", "warehouses", "inspection", "retailers", "all"]).optional() },
  async ({ type }) => toolResult(await apiGet("/api/catalog/actors", { type }))
);

server.tool(
  "catalog_locations",
  "List geographic locations — manufacturing, distribution, and retail locations (37 total)",
  { type: z.enum(["manufacturing", "distribution", "retail", "all"]).optional() },
  async ({ type }) => toolResult(await apiGet("/api/catalog/locations", { type }))
);

// ── Stripe ───────────────────────────────────────────────────────────

server.tool(
  "stripe_checkout",
  "Create a Stripe checkout session for a subscription plan",
  {
    plan: z.enum(["starter", "brand", "business"]),
    brandId: z.string().optional(),
    email: z.string().optional(),
  },
  async (args) => toolResult(await apiPost("/api/stripe/checkout", args))
);

server.tool(
  "stripe_plans",
  "List available pricing plans (Starter Free, Brand $99/mo, Business $299/mo)",
  {},
  async () => toolResult(await apiGet("/api/stripe/checkout"))
);

// ── Platform ─────────────────────────────────────────────────────────

server.tool(
  "health",
  "Check platform health — API status, database connectivity, latency",
  {},
  async () => toolResult(await apiGet("/api/health"))
);

server.tool(
  "analytics",
  "Get platform analytics — daily scans, top countries, category breakdown, status distribution",
  { brandId: z.string().optional().describe("Filter by brand (optional)") },
  async ({ brandId }) => toolResult(await apiGet("/api/analytics", { brandId }))
);

server.tool(
  "audit_log",
  "Get platform-wide audit log of all actions",
  { limit: z.number().optional().describe("Number of entries (default 30)") },
  async ({ limit }) => toolResult(await apiGet("/api/audit", { limit }))
);

server.tool(
  "explore",
  "List public products for the explore gallery",
  { limit: z.number().optional(), status: z.string().optional() },
  async (args) => toolResult(await apiGet("/api/explore", args))
);

server.tool(
  "webhooks_create",
  "Register a webhook URL to receive scan, threat, or recall notifications",
  {
    brandId: z.string(),
    url: z.string().describe("Webhook callback URL"),
    events: z.array(z.string()).optional().describe("Event types: verification_scan, threat_alert, product_recall"),
  },
  async (args) => toolResult(await apiPost("/api/webhooks", args))
);

server.tool(
  "webhooks_list",
  "List configured webhooks for a brand",
  { brandId: z.string() },
  async ({ brandId }) => toolResult(await apiGet("/api/webhooks", { brandId }))
);

server.tool(
  "webhooks_delete",
  "Delete a webhook",
  { brandId: z.string(), webhookId: z.string() },
  async (args) => toolResult(await apiDelete("/api/webhooks", args))
);

// ── Start ────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
