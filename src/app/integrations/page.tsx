"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const INTEGRATIONS = [
  {
    name: "Shipping Carriers",
    endpoint: "POST /api/ingest/shipping",
    carriers: ["FedEx", "DHL", "UPS", "USPS", "Chronopost"],
    description: "Automatically tracks shipments. When a carrier fires a tracking webhook (picked up, in transit, delivered), the event is mapped to GenuProof's provenance chain.",
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
      <SiteNav />

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
            <div>  GenuProof maps carrier status to event type</div>
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
        {/* ═══ SIMULATION ═══ */}
        <div className="mt-16 pt-12 border-t border-border">
          <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Demo</p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight mb-3">
            Simulate a <em className="text-accent">full journey.</em>
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Create a product and automatically play out its entire supply chain — from manufacturing
            through shipping, customs, warehousing, and final sale. Each step is a hash-chained event
            from a simulated webhook.
          </p>

          <SimulationPanel />
        </div>
      </div>
    </div>
  );
}

function SimulationPanel() {
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [productName, setProductName] = useState("");
  const [journey, setJourney] = useState("luxury_watch");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);
  const [brandsLoaded, setBrandsLoaded] = useState(false);

  // Load brands on first interaction
  const loadBrands = async () => {
    if (brandsLoaded) return;
    try {
      const res = await fetch("/api/brands/list");
      const data = await res.json();
      if (res.ok && data.brands) {
        setBrands(data.brands);
        if (data.brands.length > 0) setBrandId(data.brands[0].id);
      }
    } catch {}
    setBrandsLoaded(true);
  };

  const runSimulation = async () => {
    if (!brandId || !productName) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/integrations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productName,
          category: journey === "luxury_watch" ? "Watches" : journey === "fashion_handbag" ? "Handbags" : journey === "pharmaceutical" ? "Pharma" : "Electronics",
          journey,
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      setSimResult({ error: String(err) });
    } finally {
      setSimulating(false);
    }
  };

  const JOURNEYS = [
    { value: "luxury_watch", label: "Luxury Watch", desc: "Switzerland → Germany → Memphis → New York (10 steps)" },
    { value: "fashion_handbag", label: "Fashion Handbag", desc: "Florence → Paris → Los Angeles → Beverly Hills (10 steps)" },
    { value: "pharmaceutical", label: "Pharmaceutical", desc: "Basel → JFK → New Jersey → Manhattan pharmacy (10 steps)" },
    { value: "electronics", label: "Electronics", desc: "Shenzhen → Long Beach → San Bernardino → San Francisco (9 steps)" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Brand</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            onFocus={loadBrands}
            className="w-full px-3 py-2.5 text-[13px] bg-card border border-border focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Product Name</label>
          <select
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] bg-card border border-border focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="">Select product</option>
            <optgroup label="Watches">
              <option value="Platinum Perpetual Calendar">Platinum Perpetual Calendar</option>
              <option value="Royal Oak Offshore 44mm">Royal Oak Offshore 44mm</option>
              <option value="Nautilus Moon Phase">Nautilus Moon Phase</option>
              <option value="Santos Chronograph">Santos Chronograph</option>
              <option value="Speedmaster Professional">Speedmaster Professional</option>
            </optgroup>
            <optgroup label="Handbags">
              <option value="Birkin 35 Togo Leather">Birkin 35 Togo Leather</option>
              <option value="Classic Flap Caviar Medium">Classic Flap Caviar Medium</option>
              <option value="Bamboo Top Handle">Bamboo Top Handle</option>
              <option value="Puzzle Bag Small">Puzzle Bag Small</option>
            </optgroup>
            <optgroup label="Jewelry">
              <option value="Serpentine Gold Cuff">Serpentine Gold Cuff</option>
              <option value="Trinity Ring Platinum">Trinity Ring Platinum</option>
              <option value="Alhambra Diamond Necklace">Alhambra Diamond Necklace</option>
            </optgroup>
            <optgroup label="Fragrances">
              <option value="Oud Royale EDP 100ml">Oud Royale EDP 100ml</option>
              <option value="Rose Absolute Parfum 50ml">Rose Absolute Parfum 50ml</option>
            </optgroup>
            <optgroup label="Electronics">
              <option value="Studio Headphones Pro">Studio Headphones Pro</option>
              <option value="Wireless Speaker Reference">Wireless Speaker Reference</option>
            </optgroup>
            <optgroup label="Pharmaceuticals">
              <option value="Insulin Pen 100U/mL">Insulin Pen 100U/mL</option>
              <option value="Cardiac Stent Model X">Cardiac Stent Model X</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Journey Template</label>
          <div className="space-y-2">
            {JOURNEYS.map((j) => (
              <label
                key={j.value}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                  journey === j.value ? "border-primary/30 bg-primary/3" : "border-border hover:bg-secondary/30"
                }`}
              >
                <input
                  type="radio"
                  name="journey"
                  value={j.value}
                  checked={journey === j.value}
                  onChange={() => setJourney(j.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-[12px] font-medium">{j.label}</div>
                  <div className="text-[10px] text-muted-foreground">{j.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={simulating || !brandId || !productName}
          className="w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {simulating ? "Simulating supply chain..." : "Run Simulation"}
        </button>
      </div>

      <div>
        {simResult ? (
          <div>
            {simResult.success ? (
              <div>
                <div className="border border-primary/20 bg-primary/3 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-medium tracking-wide uppercase text-primary">Simulation Complete</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground ml-3.5">
                    Product created with {String((simResult.journey as Record<string, unknown>)?.totalSteps)} hash-chained supply chain events.
                  </p>
                </div>

                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">Product</div>
                <div className="border border-border p-3 mb-4 space-y-1">
                  <div className="text-[13px] font-medium">{String((simResult.product as Record<string, unknown>)?.name)}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Code: {String((simResult.product as Record<string, unknown>)?.verificationCode)}</div>
                </div>

                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">Journey ({String((simResult.journey as Record<string, unknown>)?.totalSteps)} events)</div>
                <div className="border-t border-border max-h-48 overflow-y-auto">
                  {((simResult.journey as Record<string, unknown>)?.events as Array<Record<string, string>>)?.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-border">
                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="text-[11px]">
                        <span className="font-medium">{e.type}</span>
                        <span className="text-muted-foreground"> — {e.actor}, {e.location}</span>
                        <div className="text-[9px] text-muted-foreground/50">{e.source}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <a
                    href={(simResult.urls as Record<string, string>)?.verify}
                    target="_blank"
                    className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground tracking-wide hover:bg-primary/90 transition-colors"
                  >
                    Verify Product
                  </a>
                  <a
                    href={(simResult.urls as Record<string, string>)?.qr}
                    target="_blank"
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
                  >
                    QR Certificate
                  </a>
                  <a
                    href={(simResult.urls as Record<string, string>)?.product}
                    target="_blank"
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
                  >
                    Product Detail
                  </a>
                </div>
              </div>
            ) : (
              <pre className="font-mono text-[10px] text-destructive bg-destructive/5 border border-destructive/20 p-4 overflow-x-auto">
                {JSON.stringify(simResult, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-border py-16 text-center">
            <p className="text-[12px] text-muted-foreground/50">
              Select a brand, name your product, choose a journey, and hit simulate.
              A fully hash-chained supply chain will be created in seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
