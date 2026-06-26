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
      verificationCode: "<your-code>",
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
  const [testProduct, setTestProduct] = useState<{ code: string; name: string } | null>(null);
  const [testProductLoaded, setTestProductLoaded] = useState(false);

  const active = INTEGRATIONS[activeIdx];

  // Load a real product for test events
  const ensureTestProduct = async () => {
    if (testProductLoaded) return testProduct;
    try {
      const brandsRes = await fetch("/api/brands/list");
      const brandsData = await brandsRes.json();
      if (brandsData.brands?.length > 0) {
        const bid = brandsData.brands[0].id;
        const prodsRes = await fetch(`/api/products/list?brandId=${bid}&limit=1`);
        const prodsData = await prodsRes.json();
        if (prodsData.products?.length > 0) {
          const p = { code: prodsData.products[0].verificationCode, name: prodsData.products[0].name };
          setTestProduct(p);
          setTestProductLoaded(true);
          return p;
        }
      }
    } catch {}
    setTestProductLoaded(true);
    return null;
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const product = await ensureTestProduct();
      if (!product) {
        setTestResult(JSON.stringify({ error: "No products found. Register a product first via the Dashboard." }, null, 2));
        setTesting(false);
        return;
      }

      const endpoints = ["/api/ingest/shipping", "/api/ingest/pos", "/api/ingest/warehouse"];
      const bodies = [
        {
          trackingNumber: `FX-${Date.now().toString().slice(-10)}`,
          carrier: "FedEx",
          status: "delivered",
          verificationCode: product.code,
          location: "New York, NY",
          signedBy: "J. Smith",
        },
        {
          orderId: `SHP-${Date.now().toString().slice(-8)}`,
          platform: "shopify",
          storeName: "Fifth Avenue Boutique",
          storeLocation: "New York, NY",
          amount: 4999.00,
          currency: "USD",
          verificationCode: product.code,
        },
        {
          action: "inspected",
          warehouseName: "US Distribution Center",
          warehouseLocation: "Newark, NJ",
          bay: "A-14",
          inspectorId: "QC-0042",
          verificationCode: product.code,
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
      setTestResult(JSON.stringify({ error: String(err) }, null, 2));
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
        <div className="border border-border bg-card p-6 mb-10 rounded-lg">
          <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground mb-5">How It Works</div>
          <div className="space-y-0">
            {[
              { text: "Carrier/POS/WMS fires webhook on status change", accent: false },
              { text: "POST /api/ingest/{shipping|pos|warehouse}", accent: false },
              { text: "GenuProof maps carrier status to event type", accent: false },
              { text: "Fetches last event hash for this product", accent: false },
              { text: "new_hash = SHA-256(event_data + previous_hash)", accent: true },
              { text: "Writes hash-chained EVENT# to DynamoDB", accent: false },
              { text: "DynamoDB Stream fires (for anomaly detection)", accent: false },
              { text: "Consumer sees full journey on verification page", accent: false },
            ].map((step, i, arr) => (
              <div key={i} className="flex gap-0">
                <div className="flex flex-col items-center w-8 shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-3 shrink-0 ${step.accent ? "bg-primary" : "bg-primary/40"}`} />
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-primary/20 mt-1" />
                  )}
                </div>
                <div className={`font-mono text-[11px] leading-relaxed py-2.5 pl-1 border-l-2 ml-0 pl-3 mb-1 ${
                  step.accent
                    ? "border-primary text-primary bg-primary/3 px-3 rounded-r-md"
                    : "border-transparent text-muted-foreground"
                }`}>
                  {step.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration tabs */}
        <div className="flex items-center gap-2 mb-8">
          {INTEGRATIONS.map((intg, i) => (
            <button
              key={intg.name}
              onClick={() => { setActiveIdx(i); setTestResult(null); }}
              className={`text-[11px] px-4 py-2 tracking-wide transition-colors cursor-pointer rounded-full ${
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
            <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3">
              {active.name}
            </div>
            <code className="font-mono text-[12px] text-accent bg-accent/5 px-2 py-1 border border-accent/10 inline-block mb-4 rounded-md">
              {active.endpoint}
            </code>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{active.description}</p>

            <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Supported Platforms
            </div>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {active.carriers.map((c) => (
                <span key={c} className="text-[10px] px-2 py-1 border border-border rounded-md">{c}</span>
              ))}
            </div>

            <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
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
              className="inline-flex items-center gap-2 text-[11px] px-4 py-2 bg-primary text-primary-foreground font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer rounded-md"
            >
              {testing && (
                <svg className="animate-spin h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {testing ? "Sending..." : "Send Test Event"}
            </button>
          </div>

          <div>
            <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
              Example Payload
            </div>
            <pre className="font-mono text-[10px] text-muted-foreground bg-secondary border border-border p-4 overflow-x-auto mb-4 leading-relaxed rounded-md">
              {JSON.stringify(active.example, null, 2)}
            </pre>

            {testResult && (() => {
              const parsed = JSON.parse(testResult);
              const isError = !!parsed.error;
              return (
                <div>
                  <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
                    Response
                  </div>
                  <pre className={`font-mono text-[10px] p-4 overflow-x-auto leading-relaxed rounded-lg border ${
                    isError
                      ? "text-destructive bg-destructive/5 border-destructive/20"
                      : "text-primary bg-primary/5 border-primary/20"
                  }`}>
                    {testResult}
                  </pre>
                  {!isError && parsed.productId && (
                    <div className="mt-3 flex gap-2">
                      <a href={`/product/${parsed.productId}`} target="_blank" className="text-[11px] px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all">
                        View Product
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
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
  const [products, setProducts] = useState<Array<{ name: string; category?: string }>>([]);
  const [productName, setProductName] = useState("");
  const [journey, setJourney] = useState("luxury_watch");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Load brands on first interaction
  const loadBrands = async () => {
    if (brandsLoaded) return;
    try {
      const res = await fetch("/api/brands/list");
      const data = await res.json();
      if (res.ok && data.brands) {
        setBrands(data.brands);
        if (data.brands.length > 0) {
          const firstId = data.brands[0].id;
          setBrandId(firstId);
          loadProducts(firstId);
        }
      }
    } catch {}
    setBrandsLoaded(true);
  };

  const loadProducts = async (bid: string) => {
    setProductsLoading(true);
    setProductName("");
    try {
      const res = await fetch(`/api/products/list?brandId=${bid}`);
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products.map((p: Record<string, unknown>) => ({
          name: p.name as string,
          category: p.category as string | undefined,
        })));
      } else {
        setProducts([]);
      }
    } catch { setProducts([]); }
    finally { setProductsLoading(false); }
  };

  const handleBrandChange = (bid: string) => {
    setBrandId(bid);
    if (bid) loadProducts(bid);
    else { setProducts([]); setProductName(""); }
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
          <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Brand</label>
          <select
            value={brandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            onFocus={loadBrands}
            className="w-full px-3 py-2.5 text-[13px] bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer rounded-md"
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Product</label>
          <select
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={!brandId || productsLoading}
            className="w-full px-3 py-2.5 text-[13px] bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer rounded-md disabled:opacity-50"
          >
            <option value="">{productsLoading ? "Loading products..." : products.length === 0 ? (brandId ? "No products found" : "Select a brand first") : "Select product"}</option>
            {(() => {
              const grouped = new Map<string, string[]>();
              for (const p of products) {
                const cat = p.category || "Other";
                if (!grouped.has(cat)) grouped.set(cat, []);
                grouped.get(cat)!.push(p.name);
              }
              if (grouped.size <= 1) {
                return products.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ));
              }
              return [...grouped.entries()].map(([cat, names]) => (
                <optgroup key={cat} label={cat}>
                  {names.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Journey Template</label>
          <div className="space-y-2">
            {JOURNEYS.map((j) => (
              <label
                key={j.value}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors rounded-lg ${
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
          className="w-full py-2.5 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer rounded-md"
        >
          {simulating && (
            <svg className="animate-spin h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {simulating ? "Simulating supply chain..." : "Run Simulation"}
        </button>
      </div>

      <div>
        {simResult ? (
          <div>
            {simResult.success ? (
              <div>
                <div className="border border-primary/20 bg-primary/3 p-4 mb-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-medium tracking-wide uppercase text-primary">Simulation Complete</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground ml-3.5">
                    Product created with {String((simResult.journey as Record<string, unknown>)?.totalSteps)} hash-chained supply chain events.
                  </p>
                </div>

                <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">Product</div>
                <div className="border border-border p-3 mb-4 space-y-1 rounded-lg">
                  <div className="text-[13px] font-medium">{String((simResult.product as Record<string, unknown>)?.name)}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">Code: {String((simResult.product as Record<string, unknown>)?.verificationCode)}</div>
                </div>

                <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">Journey ({String((simResult.journey as Record<string, unknown>)?.totalSteps)} events)</div>
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
                    className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground tracking-wide hover:bg-primary/90 transition-colors rounded-md"
                  >
                    Verify Product
                  </a>
                  <a
                    href={(simResult.urls as Record<string, string>)?.qr}
                    target="_blank"
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors rounded-md"
                  >
                    QR Certificate
                  </a>
                  <a
                    href={(simResult.urls as Record<string, string>)?.product}
                    target="_blank"
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors rounded-md"
                  >
                    Product Detail
                  </a>
                </div>
              </div>
            ) : (
              <pre className="font-mono text-[10px] text-destructive bg-destructive/5 border border-destructive/20 p-4 overflow-x-auto rounded-lg">
                {JSON.stringify(simResult, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-border py-16 text-center rounded-lg">
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
