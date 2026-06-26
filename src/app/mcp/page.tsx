"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const TOOLS = [
  {
    category: "Brands",
    tools: [
      { name: "brands_create", desc: "Register a new brand", params: "name, domain, industry, logoUrl?" },
      { name: "brands_get", desc: "Get a brand profile by ID", params: "id" },
      { name: "brands_list", desc: "List all registered brands", params: "none" },
      { name: "brands_stats", desc: "Real-time brand statistics (products, scans, threats)", params: "brandId" },
    ],
  },
  {
    category: "Products",
    tools: [
      { name: "products_register", desc: "Register a product with SHA-256 hash + HMAC signature", params: "brandId, name, sku?, category?, description?, metadata?" },
      { name: "products_batch", desc: "Batch register up to 50 products", params: "brandId, products[]" },
      { name: "products_verify", desc: "Verify authenticity \u2014 hash, signature, chain integrity + anomaly detection", params: "code? | productId?" },
      { name: "products_list", desc: "List products for a brand", params: "brandId, limit?" },
      { name: "products_search", desc: "Search by verification code, product ID, or brand", params: "code? | productId? | brandId?" },
      { name: "products_events_add", desc: "Add a hash-chained provenance event", params: "productId, type, actor, location?, data?" },
      { name: "products_events_get", desc: "Get the full provenance chain for a product", params: "productId" },
      { name: "products_history", desc: "Bulk: add same event to multiple products (max 50)", params: "productIds[], type, actor, location?" },
      { name: "products_transfer", desc: "Transfer product ownership with chain event", params: "productId, newOwner, location?, reason?" },
      { name: "products_recall", desc: "Recall a product \u2014 creates critical threat alert", params: "productId, reason, issuedBy?" },
      { name: "products_claim", desc: "Consumer claim \u2014 locks product to device fingerprint", params: "productId, consumerName?, email?" },
      { name: "products_claim_get", desc: "Check if a product has been claimed", params: "productId" },
      { name: "products_dispute", desc: "File an ownership dispute", params: "productId, consumerName?, email?, orderNumber?, notes?" },
      { name: "products_dispute_get", desc: "Get disputes filed against a product", params: "productId" },
      { name: "products_certificate", desc: "Export full cryptographic certificate (JSON)", params: "code? | productId?" },
      { name: "products_qr", desc: "Generate QR code URL (PNG or SVG)", params: "code? | productId?, format?" },
      { name: "products_dpp_export", desc: "EU Digital Product Passport export (ESPR-2024/1781)", params: "code? | productId?" },
    ],
  },
  {
    category: "Webhook Ingestion",
    tools: [
      { name: "ingest_shipping", desc: "Carrier webhook \u2014 FedEx, DHL, UPS, USPS, Chronopost", params: "trackingNumber, carrier, status, productId?, location?" },
      { name: "ingest_pos", desc: "POS webhook \u2014 Shopify, Square, WooCommerce, Stripe", params: "orderId, platform, productId?, storeName?, amount?" },
      { name: "ingest_warehouse", desc: "WMS webhook \u2014 received, inspected, stored, dispatched, returned", params: "action, warehouseName, productId?, bay?, inspectorId?" },
    ],
  },
  {
    category: "Integrations",
    tools: [
      { name: "integrations_configure", desc: "Configure an integration (generates ingest key)", params: "brandId, type" },
      { name: "integrations_list", desc: "List configured integrations", params: "brandId" },
      { name: "integrations_simulate", desc: "Run supply chain simulation through an industry journey", params: "brandId, productName, journey, sku?, category?" },
      { name: "integrations_status", desc: "Integration status and source breakdown", params: "brandId" },
      { name: "integrations_journeys", desc: "List 4 journey templates (watch, handbag, pharma, electronics)", params: "none" },
    ],
  },
  {
    category: "Threats & AI",
    tools: [
      { name: "threats_list", desc: "Threat alerts \u2014 geographic anomaly, burst scan, tag cloning, hash tampering", params: "brandId, limit?" },
      { name: "ops_log", desc: "Gemini AI operations log \u2014 severity, confidence, attack vector, latency", params: "limit?" },
      { name: "scans_list", desc: "Scan history with location aggregation", params: "productId, limit?" },
    ],
  },
  {
    category: "Catalog",
    tools: [
      { name: "catalog_categories", desc: "14 product categories (watches, handbags, pharma, etc.)", params: "none" },
      { name: "catalog_actors", desc: "37 supply chain actors (carriers, warehouses, inspection, retailers)", params: "type?" },
      { name: "catalog_locations", desc: "37 geographic locations (manufacturing, distribution, retail)", params: "type?" },
    ],
  },
  {
    category: "Stripe",
    tools: [
      { name: "stripe_checkout", desc: "Create subscription checkout session", params: "plan, brandId?, email?" },
      { name: "stripe_plans", desc: "List pricing plans (Free / $99 / $299)", params: "none" },
    ],
  },
  {
    category: "Platform",
    tools: [
      { name: "health", desc: "API status, database connectivity, latency", params: "none" },
      { name: "analytics", desc: "Daily scans, top countries, category breakdown", params: "brandId?" },
      { name: "audit_log", desc: "Platform-wide audit log of all actions", params: "limit?" },
      { name: "explore", desc: "Public product gallery listing", params: "limit?, status?" },
      { name: "webhooks_create", desc: "Register webhook URL for notifications", params: "brandId, url, events?" },
      { name: "webhooks_list", desc: "List configured webhooks", params: "brandId" },
      { name: "webhooks_delete", desc: "Delete a webhook", params: "brandId, webhookId" },
    ],
  },
];

const TOTAL_TOOLS = TOOLS.reduce((sum, cat) => sum + cat.tools.length, 0);

const CONFIG_CLAUDE_CODE = `// Claude Code — .claude/settings.json or .mcp.json
{
  "mcpServers": {
    "genuproof": {
      "command": "node",
      "args": ["mcp/server.mjs"],
      "cwd": "/path/to/genuproof"
    }
  }
}`;

const CONFIG_CLAUDE_DESKTOP = `// Claude Desktop — claude_desktop_config.json
{
  "mcpServers": {
    "genuproof": {
      "command": "node",
      "args": ["/absolute/path/to/genuproof/mcp/server.mjs"],
      "env": {
        "GENUPROOF_BASE_URL": "https://genuproof.com"
      }
    }
  }
}`;

const CONFIG_CURSOR = `// Cursor — .cursor/mcp.json
{
  "mcpServers": {
    "genuproof": {
      "command": "node",
      "args": ["mcp/server.mjs"],
      "cwd": "/path/to/genuproof"
    }
  }
}`;

const CONFIG_CUSTOM = `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp/server.mjs"],
  cwd: "/path/to/genuproof",
});

const client = new Client({ name: "my-app", version: "1.0" });
await client.connect(transport);

// List all 44 tools
const { tools } = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: "products_verify",
  arguments: { code: "wfPHybaFV3_a" },
});`;

type ConfigTab = "claude-code" | "claude-desktop" | "cursor" | "custom";

export default function McpPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Brands");
  const [configTab, setConfigTab] = useState<ConfigTab>("claude-code");
  const [copied, setCopied] = useState(false);

  const configMap: Record<ConfigTab, string> = {
    "claude-code": CONFIG_CLAUDE_CODE,
    "claude-desktop": CONFIG_CLAUDE_DESKTOP,
    cursor: CONFIG_CURSOR,
    custom: CONFIG_CUSTOM,
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-12">
        {/* Header */}
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4">
          Model Context Protocol
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-[1.05] tracking-tight mb-3">
          MCP <em className="text-accent">Server</em>
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 max-w-lg">
          Connect any AI assistant to GenuProof&apos;s full platform. Register brands, verify products,
          track supply chains, monitor threats, and export EU DPP compliance data — all through natural language.
        </p>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-10">
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Tools</span>
            <span className="font-mono text-[13px] font-medium">{TOTAL_TOOLS}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Categories</span>
            <span className="font-mono text-[13px] font-medium">{TOOLS.length}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Transport</span>
            <span className="font-mono text-[13px] font-medium">stdio</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Protocol</span>
            <span className="font-mono text-[13px] font-medium">JSON-RPC 2.0</span>
          </div>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">Quick Start</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-[13px] text-foreground mb-1">Clone the repository</p>
                <pre className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg p-3">git clone https://github.com/4KInc/genuproof.git && cd genuproof && npm install</pre>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-[13px] text-foreground mb-1">Test the server</p>
                <pre className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg p-3">npm run mcp</pre>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-lg w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-[13px] text-foreground mb-1">Add the configuration below to your AI client</p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">Configuration</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-2 p-2 border-b border-border">
              {(
                [
                  { id: "claude-code" as ConfigTab, label: "Claude Code" },
                  { id: "claude-desktop" as ConfigTab, label: "Claude Desktop" },
                  { id: "cursor" as ConfigTab, label: "Cursor" },
                  { id: "custom" as ConfigTab, label: "Custom Client" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setConfigTab(tab.id)}
                  className={`px-3 py-1.5 text-[12px] tracking-wide transition-colors rounded-full ${
                    configTab === tab.id
                      ? "bg-secondary text-foreground font-medium border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Code block */}
            <div className="relative">
              <pre className="font-mono text-[11px] text-muted-foreground p-4 overflow-x-auto leading-relaxed">
                {configMap[configTab]}
              </pre>
              <button
                onClick={() => handleCopy(configMap[configTab])}
                className="absolute top-3 right-3 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground bg-secondary border border-border rounded-md px-2 py-1 transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground mt-3">
            Set <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 border border-border">GENUPROOF_BASE_URL</code> to
            point to a different instance. Defaults to <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 border border-border">https://genuproof.com</code>
          </p>
        </section>

        {/* Example Conversations */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">What You Can Ask</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { q: "Register a luxury watch brand called Maison Noir", tool: "brands_create" },
              { q: "Verify product wfPHybaFV3_a and show me the provenance chain", tool: "products_verify" },
              { q: "Are there any active threats for my brand?", tool: "threats_list" },
              { q: "Export the EU Digital Product Passport for this watch", tool: "products_dpp_export" },
              { q: "Simulate a luxury watch journey from Switzerland to NYC", tool: "integrations_simulate" },
              { q: "Show me all Gemini AI operations and their confidence scores", tool: "ops_log" },
              { q: "Register 20 products in my handbag collection", tool: "products_batch" },
              { q: "Set up a FedEx webhook integration for my brand", tool: "integrations_configure" },
            ].map((ex) => (
              <div key={ex.q} className="border border-border rounded-lg p-3">
                <p className="text-[13px] text-foreground leading-snug mb-1.5">&ldquo;{ex.q}&rdquo;</p>
                <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border rounded-md">
                  {ex.tool}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tools Reference */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">
            Tools Reference
          </h2>
          <p className="text-[13px] text-muted-foreground mb-6">
            {TOTAL_TOOLS} tools across {TOOLS.length} categories. Each tool maps directly to a GenuProof API endpoint.
          </p>

          <div className="border-t border-border">
            {TOOLS.map((cat) => (
              <div key={cat.category} className="border-b border-border">
                {/* Category header */}
                <button
                  onClick={() =>
                    setExpandedCategory(expandedCategory === cat.category ? null : cat.category)
                  }
                  className={`w-full flex items-center justify-between py-3 px-3 text-left group rounded-lg transition-colors ${
                    expandedCategory === cat.category ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-[14px] font-medium">{cat.category}</h3>
                    <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border rounded-md">
                      {cat.tools.length}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      expandedCategory === cat.category ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Tools list */}
                {expandedCategory === cat.category && (
                  <div className="pb-4">
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                          <th className="text-left pb-2 px-1 font-normal">Tool</th>
                          <th className="text-left pb-2 px-1 font-normal">Description</th>
                          <th className="text-left pb-2 px-1 font-normal hidden md:table-cell">Parameters</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.tools.map((tool) => (
                          <tr key={tool.name} className="border-t border-border/50">
                            <td className="py-2 px-1 align-top">
                              <code className="font-mono text-[11px] text-primary whitespace-nowrap">
                                {tool.name}
                              </code>
                            </td>
                            <td className="py-2 px-1 align-top">
                              <span className="text-[12px] text-muted-foreground">{tool.desc}</span>
                            </td>
                            <td className="py-2 px-1 align-top hidden md:table-cell">
                              <code className="font-mono text-[10px] text-muted-foreground">
                                {tool.params}
                              </code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">How It Works</h2>
          <div className="border border-border rounded-lg p-5">
            <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre overflow-x-auto">{`AI Assistant (Claude, Cursor, custom)
        |
        | JSON-RPC 2.0 over stdio
        |
   MCP Server (mcp/server.mjs)
        |
        | HTTP fetch (GET/POST/DELETE)
        |
   GenuProof API (Vercel)
    |         |          |
 DynamoDB   Lambda    Gemini 2.5
 (single    (threat   (AI threat
  table)    detect)   classify)`}</pre>
          </div>
          <div className="mt-4 space-y-2 text-[13px] text-muted-foreground">
            <p>
              The MCP server translates natural-language tool calls into HTTP requests against the GenuProof API.
              Every tool returns structured JSON that the AI assistant can reason over and present to the user.
            </p>
            <p>
              No API keys required for read operations. The server connects to the live production instance by default.
              Point <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 border border-border">GENUPROOF_BASE_URL</code> to
              a local dev server for development.
            </p>
          </div>
        </section>

        {/* Environment Variables */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">Environment Variables</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            {[
              { name: "GENUPROOF_BASE_URL", desc: "Base URL of the GenuProof instance", default: "https://genuproof.com" },
              { name: "BASE_URL", desc: "Fallback base URL (if GENUPROOF_BASE_URL not set)", default: "https://genuproof.com" },
            ].map((env) => (
              <div key={env.name} className="flex items-start gap-4 py-3 px-4 border-b border-border last:border-b-0">
                <code className="font-mono text-[11px] text-primary whitespace-nowrap mt-0.5">{env.name}</code>
                <div>
                  <p className="text-[12px] text-muted-foreground">{env.desc}</p>
                  <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">default: {env.default}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer links */}
        <div className="flex items-center gap-6 pt-6 border-t border-border">
          <Link href="/docs" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            API Reference
          </Link>
          <Link href="/integrations" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Integrations
          </Link>
          <Link href="/dashboard" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <a
            href="https://github.com/4KInc/genuproof"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
