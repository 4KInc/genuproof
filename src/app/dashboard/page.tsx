"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ScanAnalytics } from "@/components/scan-heatmap";
import { ActivityFeed } from "@/components/activity-feed";
import { LiveThreats } from "@/components/live-threats";
import { SiteNav } from "@/components/site-nav";

interface RegisteredProduct {
  productId: string;
  verificationCode: string;
  hash: string;
  verifyUrl: string;
  name: string;
  status?: string;
  scanCount?: number;
  category?: string;
  sku?: string;
}

interface BrandStats {
  productCount: number;
  activeProducts: number;
  recalledProducts: number;
  totalScans: number;
  unresolvedThreats: number;
}

interface ThreatAlert {
  type: string;
  severity: string;
  productId?: string;
  details: string;
  timestamp: string;
  resolved: boolean;
}

const TABS = ["overview", "register", "products", "provenance", "threats"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  register: "Register",
  products: "Products",
  provenance: "Supply Chain",
  threats: "Threats",
  overview: "Overview",
};

interface ExistingBrand {
  id: string;
  name: string;
  domain: string;
  industry: string;
  createdAt: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const [brandId, setBrandId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandRegistered, setBrandRegistered] = useState(false);
  const [existingBrands, setExistingBrands] = useState<ExistingBrand[]>([]);
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [brandForm, setBrandForm] = useState({ name: "", domain: "", industry: "fashion" });
  const [productForm, setProductForm] = useState({
    name: "", sku: "", category: "", description: "", manufacturingLocation: "",
  });
  const [eventForm, setEventForm] = useState({
    productId: "", type: "shipped", actor: "", location: "",
  });

  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [stats, setStats] = useState<BrandStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const registerBrand = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brandForm) });
      const data = await res.json();
      if (res.ok) { setBrandId(data.id); setBrandName(data.name); setBrandRegistered(true); setMessage({ type: "success", text: `Brand "${data.name}" registered` }); }
      else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Failed to register brand" }); }
    finally { setLoading(false); }
  };

  const registerProduct = async () => {
    if (!brandId) return;
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/products/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...productForm, brandId }) });
      const data = await res.json();
      if (res.ok) { setProducts(p => [{ ...data, name: productForm.name }, ...p]); setProductForm({ name: "", sku: "", category: "", description: "", manufacturingLocation: "" }); setMessage({ type: "success", text: `Registered. Code: ${data.verificationCode}` }); }
      else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Failed to register" }); }
    finally { setLoading(false); }
  };

  const addEvent = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/products/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
      const data = await res.json();
      if (res.ok) { setMessage({ type: "success", text: `Event added. Hash: ${data.hash.slice(0, 16)}...` }); setEventForm({ ...eventForm, actor: "", location: "" }); }
      else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Failed" }); }
    finally { setLoading(false); }
  };

  const fetchThreats = useCallback(async () => {
    if (!brandId) return;
    try { const res = await fetch(`/api/threats?brandId=${brandId}`); const data = await res.json(); if (res.ok) setThreats(data.threats); } catch {}
  }, [brandId]);

  useEffect(() => { if (brandRegistered) fetchThreats(); }, [brandRegistered, fetchThreats]);

  // Load existing brands on mount
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch("/api/brands/list");
        const data = await res.json();
        if (res.ok && data.brands) setExistingBrands(data.brands);
      } catch { /* silent */ }
      finally { setBrandsLoading(false); }
    }
    loadBrands();
  }, []);

  // Load products when brand is selected
  const loadBrandProducts = useCallback(async (bid: string) => {
    try {
      const res = await fetch(`/api/products/list?brandId=${bid}`);
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products.map((p: Record<string, unknown>) => ({
          productId: p.productId as string,
          verificationCode: p.verificationCode as string,
          hash: p.hash as string,
          verifyUrl: "",
          name: p.name as string,
          status: p.status as string,
          scanCount: p.scanCount as number,
          category: p.category as string,
          sku: p.sku as string,
        })));
      }
    } catch { /* silent */ }
  }, []);

  const loadBrandStats = useCallback(async (bid: string) => {
    try {
      const res = await fetch(`/api/brands/stats?brandId=${bid}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch { /* silent */ }
  }, []);

  const recallProduct = async (productId: string, productName: string) => {
    const reason = prompt(`Recall reason for "${productName}":`);
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch("/api/products/recall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, reason, issuedBy: brandName }) });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Product recalled. Hash: ${data.hash.slice(0, 16)}...` });
        setProducts(p => p.map(pr => pr.productId === productId ? { ...pr, status: "recalled" } : pr));
        fetchThreats();
      } else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Recall failed" }); }
    finally { setLoading(false); }
  };

  const transferProduct = async (productId: string, productName: string) => {
    const newOwner = prompt(`Transfer "${productName}" to (new owner name):`);
    if (!newOwner) return;
    const location = prompt("Transfer location (optional):") || undefined;
    setLoading(true);
    try {
      const res = await fetch("/api/products/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, newOwner, location }) });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Transferred to ${newOwner}. Hash: ${data.hash.slice(0, 16)}...` });
        setProducts(p => p.map(pr => pr.productId === productId ? { ...pr, status: "transferred" } : pr));
      } else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Transfer failed" }); }
    finally { setLoading(false); }
  };

  const selectBrand = (brand: ExistingBrand) => {
    setBrandId(brand.id);
    setBrandName(brand.name);
    setBrandRegistered(true);
    setActiveTab("overview");
    loadBrandProducts(brand.id);
    loadBrandStats(brand.id);
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000); };

  const inputClass = "w-full px-3 py-2.5 text-[13px] bg-card border border-border focus:outline-none focus:border-primary/50 transition-colors";
  const labelClass = "text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block";
  const btnClass = "w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      {brandRegistered && (
        <aside className="w-52 border-r border-border flex flex-col bg-card/50">
          <div className="p-5 border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-5 h-5 border-[1.5px] border-primary rounded-sm flex items-center justify-center">
                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-[12px] font-medium tracking-wide uppercase">GenuProof</span>
            </Link>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] text-muted-foreground truncate">{brandName}</span>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === "threats") fetchThreats(); }}
                className={`w-full text-left px-3 py-2 text-[12px] tracking-wide transition-colors ${
                  activeTab === tab
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  {TAB_LABELS[tab]}
                  {tab === "threats" && threats.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  )}
                </div>
              </button>
            ))}
          </nav>

          <div className="p-5 border-t border-border">
            <div className="text-[10px] text-muted-foreground/50 space-y-0.5 mb-3">
              <div>Products: {products.length}</div>
              <div className="font-mono">{brandId.slice(0, 8)}...</div>
            </div>
            <div className="flex flex-col gap-1">
              <Link href="/analytics" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Analytics
              </Link>
              <Link href="/explore" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Explore
              </Link>
              <button
                onClick={() => { setBrandRegistered(false); setProducts([]); setThreats([]); setShowNewBrandForm(false); }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer"
              >
                Switch brand
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {!brandRegistered && <SiteNav />}

        <div className={brandRegistered ? "p-8 max-w-3xl" : "max-w-lg mx-auto px-6 py-16"}>
          {/* Message */}
          {message && (
            <div className={`mb-6 px-4 py-3 border text-[12px] flex items-center gap-2 ${
              message.type === "success" ? "border-primary/20 bg-primary/5 text-primary" : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${message.type === "success" ? "bg-primary" : "bg-destructive"}`} />
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto text-[10px] opacity-50 hover:opacity-100">dismiss</button>
            </div>
          )}

          {/* Brand Selection / Registration */}
          {!brandRegistered ? (
            <div>
              <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4 animate-reveal">
                Dashboard
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-[1.05] tracking-tight mb-3 animate-reveal delay-1">
                Select your <em className="text-accent">brand.</em>
              </h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 animate-reveal delay-2">
                Choose an existing brand or create a new one.
              </p>

              {/* Existing brands */}
              {brandsLoading ? (
                <div className="text-[12px] text-muted-foreground py-8 text-center animate-reveal delay-3">Loading brands...</div>
              ) : existingBrands.length > 0 && !showNewBrandForm ? (
                <div className="animate-reveal delay-3">
                  <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3">
                    Existing Brands ({existingBrands.length})
                  </div>
                  <div className="border-t border-border">
                    {existingBrands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => selectBrand(brand)}
                        className="w-full text-left py-4 border-b border-border hover:bg-secondary/30 transition-colors group px-1 -mx-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[14px] font-medium group-hover:text-primary transition-colors">
                              {brand.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {brand.domain} &middot; {brand.industry} &middot; {new Date(brand.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowNewBrandForm(true)}
                    className="mt-4 text-[12px] text-primary hover:underline"
                  >
                    + Register a new brand
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-reveal delay-3">
                  {existingBrands.length > 0 && (
                    <button
                      onClick={() => setShowNewBrandForm(false)}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      &larr; Back to brand list
                    </button>
                  )}
                  <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                    New Brand
                  </div>
                  <div><label className={labelClass}>Brand Name</label><input type="text" value={brandForm.name} onChange={e => setBrandForm({...brandForm, name: e.target.value})} placeholder="e.g. Luxe Watches" className={inputClass} /></div>
                  <div><label className={labelClass}>Domain</label><input type="text" value={brandForm.domain} onChange={e => setBrandForm({...brandForm, domain: e.target.value})} placeholder="e.g. luxewatches.com" className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Industry</label>
                    <select value={brandForm.industry} onChange={e => setBrandForm({...brandForm, industry: e.target.value})} className={inputClass}>
                      <option value="fashion">Fashion & Luxury</option>
                      <option value="electronics">Electronics</option>
                      <option value="pharmaceuticals">Pharmaceuticals</option>
                      <option value="food">Food & Beverage</option>
                      <option value="automotive">Automotive</option>
                      <option value="cosmetics">Cosmetics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button onClick={registerBrand} disabled={loading || !brandForm.name || !brandForm.domain} className={btnClass}>
                    {loading ? "Registering..." : "Register Brand"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === "overview" && (
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-6">Overview</h2>
                  <ScanAnalytics
                    scans={[]}
                    threats={threats}
                    totalScans={stats?.totalScans || 0}
                    totalProducts={stats?.productCount || products.length}
                  />
                  {stats && (
                    <div className="grid grid-cols-3 gap-px bg-border mt-6">
                      {[
                        { label: "Active", value: stats.activeProducts },
                        { label: "Recalled", value: stats.recalledProducts },
                        { label: "Alerts", value: stats.unresolvedThreats },
                      ].map((s) => (
                        <div key={s.label} className="bg-background p-4">
                          <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">{s.label}</div>
                          <div className="font-[family-name:var(--font-display)] text-xl">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live Threat Feed */}
                  <div className="mt-8">
                    <LiveThreats brandId={brandId} />
                  </div>

                  {/* Activity Feed */}
                  <div className="mt-8">
                    <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
                      Recent Activity
                    </div>
                    <ActivityFeed brandId={brandId} />
                  </div>
                </div>
              )}

              {/* Register Product */}
              {activeTab === "register" && (
                <div className="max-w-md">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Register Product</h2>
                  <p className="text-[12px] text-muted-foreground mb-6">Each product receives a unique cryptographic certificate.</p>
                  <div className="space-y-4">
                    <div><label className={labelClass}>Product Name *</label><input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Classic Chronograph 42mm" className={inputClass} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>SKU</label><input type="text" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} placeholder="LW-CC-42" className={`${inputClass} font-mono`} /></div>
                      <div>
                        <label className={labelClass}>Category</label>
                        <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className={inputClass}>
                          <option value="">Select category</option>
                          <option value="Watches">Watches</option>
                          <option value="Handbags">Handbags</option>
                          <option value="Jewelry">Jewelry</option>
                          <option value="Eyewear">Eyewear</option>
                          <option value="Fragrances">Fragrances</option>
                          <option value="Footwear">Footwear</option>
                          <option value="Clothing">Clothing</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Pharmaceuticals">Pharmaceuticals</option>
                          <option value="Wine & Spirits">Wine & Spirits</option>
                          <option value="Art">Art</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div><label className={labelClass}>Description</label><textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Product description..." rows={2} className={`${inputClass} resize-none`} /></div>
                    <div>
                      <label className={labelClass}>Manufacturing Location</label>
                      <select value={productForm.manufacturingLocation} onChange={e => setProductForm({...productForm, manufacturingLocation: e.target.value})} className={inputClass}>
                        <option value="">Select location</option>
                        <option value="Geneva, Switzerland">Geneva, Switzerland</option>
                        <option value="Le Brassus, Switzerland">Le Brassus, Switzerland</option>
                        <option value="Le Locle, Switzerland">Le Locle, Switzerland</option>
                        <option value="La Chaux-de-Fonds, Switzerland">La Chaux-de-Fonds, Switzerland</option>
                        <option value="Florence, Italy">Florence, Italy</option>
                        <option value="Valenza, Italy">Valenza, Italy</option>
                        <option value="Belluno, Italy">Belluno, Italy</option>
                        <option value="Milan, Italy">Milan, Italy</option>
                        <option value="Paris, France">Paris, France</option>
                        <option value="Grasse, France">Grasse, France</option>
                        <option value="Ubrique, Spain">Ubrique, Spain</option>
                        <option value="London, United Kingdom">London, United Kingdom</option>
                        <option value="Munich, Germany">Munich, Germany</option>
                        <option value="Tokyo, Japan">Tokyo, Japan</option>
                        <option value="Shenzhen, China">Shenzhen, China</option>
                        <option value="New York, NY">New York, NY</option>
                        <option value="Los Angeles, CA">Los Angeles, CA</option>
                      </select>
                    </div>
                    <button onClick={registerProduct} disabled={loading || !productForm.name} className={btnClass}>
                      {loading ? "Registering..." : "Register Product"}
                    </button>
                  </div>
                </div>
              )}

              {/* Products */}
              {activeTab === "products" && (
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-6">
                    Products <span className="text-muted-foreground text-lg">({products.length})</span>
                  </h2>
                  {products.length === 0 ? (
                    <div className="border border-dashed border-border py-14 text-center">
                      <p className="text-[13px] text-muted-foreground">No products registered.</p>
                      <button onClick={() => setActiveTab("register")} className="mt-2 text-[12px] text-primary hover:underline">Register your first product</button>
                    </div>
                  ) : (
                    <div className="border-t border-border">
                      {products.map(p => {
                      const statusColor = p.status === "active" ? "text-primary bg-primary/5 border-primary/20"
                        : p.status === "recalled" ? "text-destructive bg-destructive/5 border-destructive/20"
                        : "text-accent bg-accent/5 border-accent/20";
                      return (
                        <div key={p.productId} className="py-4 border-b border-border hover:bg-secondary/20 transition-colors px-1 -mx-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium">{p.name}</span>
                                <span className={`text-[9px] tracking-wide uppercase font-medium px-1.5 py-0.5 border ${statusColor}`}>
                                  {p.status || "active"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button onClick={() => copyCode(p.verificationCode)} className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                  {copiedCode === p.verificationCode ? "Copied" : p.verificationCode}
                                </button>
                                {p.sku && <span className="text-[10px] text-muted-foreground/50">{p.sku}</span>}
                                {p.category && <span className="text-[10px] text-muted-foreground/50">{p.category}</span>}
                                {(p.scanCount ?? 0) > 0 && <span className="text-[10px] text-muted-foreground/50">{p.scanCount} scans</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              <Link href={`/verify/${p.verificationCode}?brand=${brandId}`} className="text-[10px] px-2.5 py-1 border border-border hover:bg-secondary transition-colors">View</Link>
                              <Link href={`/qr/${p.verificationCode}`} className="text-[10px] px-2.5 py-1 border border-border hover:bg-secondary transition-colors">QR</Link>
                              <Link href={`/product/${p.productId}`} className="text-[10px] px-2.5 py-1 border border-border hover:bg-secondary transition-colors">Detail</Link>
                              <a href={`/api/products/certificate?code=${p.verificationCode}`} target="_blank" className="text-[10px] px-2.5 py-1 border border-border hover:bg-secondary transition-colors">JSON</a>
                              {p.status === "active" && (
                                <>
                                  <button onClick={() => transferProduct(p.productId, p.name)} disabled={loading} className="text-[10px] px-2.5 py-1 border border-accent/30 text-accent hover:bg-accent/5 transition-colors cursor-pointer">Transfer</button>
                                  <button onClick={() => recallProduct(p.productId, p.name)} disabled={loading} className="text-[10px] px-2.5 py-1 border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors cursor-pointer">Recall</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              )}

              {/* Provenance */}
              {activeTab === "provenance" && (
                <div className="max-w-md">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Supply Chain Event</h2>
                  <p className="text-[12px] text-muted-foreground mb-6">Each event is hash-chained to the previous one.</p>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Product</label>
                      {products.length > 0 ? (
                        <select value={eventForm.productId} onChange={e => setEventForm({...eventForm, productId: e.target.value})} className={inputClass}>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.productId} value={p.productId}>{p.name} ({p.verificationCode})</option>)}
                        </select>
                      ) : <p className="text-[12px] text-muted-foreground">Register a product first.</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Event Type</label>
                      <select value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})} className={inputClass}>
                        {["shipped","received","inspected","sold","transferred","recalled","custom"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Actor / Handler</label>
                      <select value={eventForm.actor} onChange={e => setEventForm({...eventForm, actor: e.target.value})} className={inputClass}>
                        <option value="">Select handler</option>
                        <optgroup label="Shipping Carriers">
                          <option value="FedEx Express">FedEx Express</option>
                          <option value="FedEx International Priority">FedEx International Priority</option>
                          <option value="DHL Express">DHL Express</option>
                          <option value="DHL International">DHL International</option>
                          <option value="UPS Worldwide">UPS Worldwide</option>
                          <option value="Swiss Post International">Swiss Post International</option>
                          <option value="Chronopost France">Chronopost France</option>
                          <option value="Maersk Shipping">Maersk Shipping</option>
                        </optgroup>
                        <optgroup label="Warehouses & Distribution">
                          <option value="US Distribution Center">US Distribution Center</option>
                          <option value="EU Distribution Hub">EU Distribution Hub</option>
                          <option value="Quality Control Team">Quality Control Team</option>
                          <option value="COSC Certification Body">COSC Certification Body</option>
                          <option value="Customs Authority">Customs Authority</option>
                          <option value="US Customs & Border Protection">US Customs & Border Protection</option>
                        </optgroup>
                        <optgroup label="Retailers">
                          <option value="Authorized Retailer">Authorized Retailer</option>
                          <option value="Fifth Avenue Boutique">Fifth Avenue Boutique</option>
                          <option value="Rodeo Drive Boutique">Rodeo Drive Boutique</option>
                          <option value="Ginza Premium Store">Ginza Premium Store</option>
                          <option value="Dubai Mall Flagship">Dubai Mall Flagship</option>
                          <option value="Online Store">Online Store</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Location</label>
                      <select value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} className={inputClass}>
                        <option value="">Select location</option>
                        <optgroup label="Switzerland">
                          <option value="Geneva, Switzerland">Geneva, Switzerland</option>
                          <option value="Le Brassus, Switzerland">Le Brassus, Switzerland</option>
                          <option value="Le Locle, Switzerland">Le Locle, Switzerland</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="Florence, Italy">Florence, Italy</option>
                          <option value="Milan, Italy">Milan, Italy</option>
                          <option value="Paris, France">Paris, France</option>
                          <option value="Frankfurt, Germany">Frankfurt, Germany</option>
                          <option value="London, United Kingdom">London, United Kingdom</option>
                        </optgroup>
                        <optgroup label="United States">
                          <option value="New York, NY">New York, NY</option>
                          <option value="Newark, NJ">Newark, NJ</option>
                          <option value="Memphis, TN">Memphis, TN</option>
                          <option value="Los Angeles, CA">Los Angeles, CA</option>
                          <option value="Beverly Hills, CA">Beverly Hills, CA</option>
                          <option value="San Francisco, CA">San Francisco, CA</option>
                          <option value="Miami, FL">Miami, FL</option>
                          <option value="Chicago, IL">Chicago, IL</option>
                        </optgroup>
                        <optgroup label="Asia & Middle East">
                          <option value="Tokyo, Japan">Tokyo, Japan</option>
                          <option value="Dubai, UAE">Dubai, UAE</option>
                          <option value="Singapore">Singapore</option>
                          <option value="Hong Kong">Hong Kong</option>
                          <option value="Shenzhen, China">Shenzhen, China</option>
                        </optgroup>
                      </select>
                    </div>
                    <button onClick={addEvent} disabled={loading || !eventForm.productId || !eventForm.actor} className={btnClass}>
                      {loading ? "Adding..." : "Add Event to Chain"}
                    </button>
                  </div>
                </div>
              )}

              {/* Threats */}
              {activeTab === "threats" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">Threats</h2>
                    <button onClick={fetchThreats} className="text-[11px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors">Refresh</button>
                  </div>
                  {threats.length === 0 ? (
                    <div className="border border-dashed border-border py-14 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[13px] text-primary font-medium">All Clear</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">No threats detected.</p>
                    </div>
                  ) : (
                    <div className="border-t border-border">
                      {threats.map((t, i) => {
                        const dotColor = t.severity === "critical" || t.severity === "high" ? "bg-destructive" : t.severity === "medium" ? "bg-warning" : "bg-muted-foreground";
                        return (
                          <div key={i} className="py-3 border-b border-border">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <span className="text-[10px] tracking-wide uppercase text-muted-foreground">{t.severity}</span>
                              <span className="text-[12px] font-medium">{t.type.replace(/_/g, " ")}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{new Date(t.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[12px] text-muted-foreground ml-3.5">{t.details}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
