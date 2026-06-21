"use client";

import { useState } from "react";
import Link from "next/link";

const INTEGRATIONS = [
  {
    name: "Shipping Carriers",
    endpoint: "POST /api/ingest/shipping",
    carriers: ["FedEx", "DHL", "UPS", "USPS", "Chronopost"],
    description: "Automatically tracks shipments. When a carrier fires a tracking webhook (picked up, in transit, delivered), the event is mapped to Authentik's provenance chain.",
    example: {
      trackingNumber: "FX-2026-8847291",
      carrier: "FedEx",
      status: "delivered",
      productId: "e084595c9732...",
      location: "New York, NY",
      signedBy: "J. Smith",
    },
    statuses: ["picked_up → shipped", "in_transit → shipped", "out_for_delivery → shipped", "delivered → received"],
  },
  {
    name: "Point of Sale",
    endpoint: "POST /api/ingest/pos",
    carriers: ["Shopify", "Square", "WooCommerce", "Stripe"],
    description: "Records the final sale to consumer. When a product is sold through any POS platform, the sale event is hash-chained into the provenance trail with order ID and store info.",
    example: {
      orderId: "SHP-2026-44521",
      platform: "shopify",
      storeName: "Fifth Avenue Boutique",
      storeLocation: "New York, NY",
      amount: 4999.00,
      currency: "USD",
      verificationCode: "wfPHybaFV3_a",
    },
    statuses: ["sale completed → sold event"],
  },
  {
    name: "Warehouse / WMS",
    endpoint: "POST /api/ingest/warehouse",
    carriers: ["SAP WMS", "Oracle WMS", "Manhattan Associates", "Custom WMS"],
    description: "Tracks internal warehouse operations. Receiving dock scans, quality inspections, storage assignments, and dispatch — all hash-chained.",
    example: {
      action: "inspected",
      warehouseName: "US Distribution Center",
      warehouseLocation: "Newark, NJ",
      bay: "A-14-3",
      inspectorId: "QC-0042",
      productId: "e084595c9732...",
    },
    statuses: ["received → received", "inspected → inspected", "stored → received", "dispatched → shipped"],
  },
];

export default function IntegrationsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const active = INTEGRATIONS[activeIdx];

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const endpoints = ["/api/ingest/shipping", "/api/ingest/pos", "/api/ingest/warehouse"];
      const bodies = [
        {
          trackingNumber: `TEST-${Date.now()}`,
          carrier: "FedEx",
          status: "delivered",
          verificationCode: "wfPHybaFV3_a",
          location: "New York, NY",
          signedBy: "Demo User",
        },
        {
          orderId: `ORD-${Date.now()}`,
          platform: "shopify",
          storeName: "Demo Store",
          storeLocation: "San Francisco, CA",
          amount: 299.99,
          currency: "USD",
          verificationCode: "wfPHybaFV3_a",
        },
        {
          action: "inspected",
          warehouseName: "Demo Warehouse",
          warehouseLocation: "Austin, TX",
          bay: "B-07",
          inspectorId: "QC-DEMO",
          verificationCode: "wfPHybaFV3_a",
        },
      ];

      const res = await fetch(endpoints[activeIdx], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodies[activeIdx]),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(`Error: ${err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide uppercase">Authentik</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">API Docs</Link>
            <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Supply Chain</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight mb-3">
          Integrations & <em className="text-accent">webhooks.</em>
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-10 max-w-lg">
          Connect your existing supply chain systems. Each integration translates carrier/POS/WMS events into
          hash-chained provenance records — automatically, with zero manual entry.
        </p>

        {/* Architecture diagram */}
        <div className="border border-border bg-card p-6 mb-10">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">How It Works</div>
          <div className="font-mono text-[11px] text-muted-foreground leading-relaxed space-y-1">
            <div>Carrier/POS/WMS fires webhook on status change</div>
            <div className="text-primary">  |</div>
            <div>  POST /api/ingest/&#123;shipping|pos|warehouse&#125;</div>
            <div className="text-primary">  |</div>
            <div>  Authentik maps carrier status to event type</div>
            <div className="text-primary">  |</div>
            <div>  Fetches last event hash for this product</div>
            <div className="text-primary">  |</div>
            <div>  new_hash = SHA-256(event_data + previous_hash)</div>
            <div className="text-primary">  |</div>
            <div>  Writes hash-chained EVENT# to DynamoDB</div>
            <div className="text-primary">  |</div>
            <div>  DynamoDB Stream fires (for anomaly detection)</div>
            <div className="text-primary">  |</div>
            <div>  Consumer sees full journey on verification page</div>
          </div>
        </div>

        {/* Integration tabs */}
        <div className="flex items-center gap-1 mb-8">
          {INTEGRATIONS.map((intg, i) => (
            <button
              key={intg.name}
              onClick={() => { setActiveIdx(i); setTestResult(null); }}
              className={`text-[11px] px-4 py-2 tracking-wide transition-colors cursor-pointer ${
                activeIdx === i
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-secondary"
              }`}
            >
              {intg.name}
            </button>
          ))}
        </div>

        {/* Active integration */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              {active.name}
            </div>
            <code className="font-mono text-[12px] text-accent bg-accent/5 px-2 py-1 border border-accent/10 inline-block mb-4">
              {active.endpoint}
            </code>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{active.description}</p>

            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Supported Platforms
            </div>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {active.carriers.map((c) => (
                <span key={c} className="text-[10px] px-2 py-1 border border-border">{c}</span>
              ))}
            </div>

            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Status Mapping
            </div>
            <div className="space-y-1 mb-6">
              {active.statuses.map((s) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span className="font-mono text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>

            <button
              onClick={runTest}
              disabled={testing}
              className="text-[11px] px-4 py-2 bg-primary text-primary-foreground font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {testing ? "Sending..." : "Send Test Event"}
            </button>
          </div>

          <div>
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Example Payload
            </div>
            <pre className="font-mono text-[10px] text-muted-foreground bg-secondary border border-border p-4 overflow-x-auto mb-4 leading-relaxed">
              {JSON.stringify(active.example, null, 2)}
            </pre>

            {testResult && (
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
                  Response
                </div>
                <pre className="font-mono text-[10px] text-primary bg-primary/5 border border-primary/20 p-4 overflow-x-auto leading-relaxed">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
