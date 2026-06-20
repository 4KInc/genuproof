"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ScanAnalytics } from "@/components/scan-heatmap";

interface RegisteredProduct {
  productId: string;
  verificationCode: string;
  hash: string;
  verifyUrl: string;
  name: string;
}

interface ThreatAlert {
  type: string;
  severity: string;
  productId?: string;
  details: string;
  timestamp: string;
  resolved: boolean;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "register" | "products" | "threats" | "provenance"
  >("register");
  const [brandId, setBrandId] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [brandRegistered, setBrandRegistered] = useState(false);

  const [brandForm, setBrandForm] = useState({
    name: "",
    domain: "",
    industry: "fashion",
  });

  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    manufacturingLocation: "",
  });

  const [eventForm, setEventForm] = useState({
    productId: "",
    type: "shipped",
    actor: "",
    location: "",
  });

  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const registerBrand = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandForm),
      });
      const data = await res.json();
      if (res.ok) {
        setBrandId(data.id);
        setBrandName(data.name);
        setBrandRegistered(true);
        setMessage({
          type: "success",
          text: `Brand "${data.name}" registered successfully`,
        });
        setActiveTab("register");
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to register brand" });
    } finally {
      setLoading(false);
    }
  };

  const registerProduct = async () => {
    if (!brandId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productForm, brandId }),
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) => [{ ...data, name: productForm.name }, ...prev]);
        setProductForm({
          name: "",
          sku: "",
          category: "",
          description: "",
          manufacturingLocation: "",
        });
        setMessage({
          type: "success",
          text: `Product registered. Code: ${data.verificationCode}`,
        });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to register product" });
    } finally {
      setLoading(false);
    }
  };

  const addProvenanceEvent = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Event "${eventForm.type}" added. Hash: ${data.hash.slice(0, 16)}...`,
        });
        setEventForm({ ...eventForm, actor: "", location: "" });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add event" });
    } finally {
      setLoading(false);
    }
  };

  const fetchThreats = useCallback(async () => {
    if (!brandId) return;
    try {
      const res = await fetch(`/api/threats?brandId=${brandId}`);
      const data = await res.json();
      if (res.ok) setThreats(data.threats);
    } catch {
      /* silent */
    }
  }, [brandId]);

  useEffect(() => {
    if (brandRegistered) fetchThreats();
  }, [brandRegistered, fetchThreats]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const NAV_ITEMS = [
    { key: "overview" as const, label: "Overview", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" },
    { key: "register" as const, label: "Register", icon: "M12 4.5v15m7.5-7.5h-15" },
    { key: "products" as const, label: "Products", icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" },
    { key: "provenance" as const, label: "Supply Chain", icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" },
    { key: "threats" as const, label: "Threats", icon: "M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Zm0 13.036h.008v.008H12v-.008Z", badge: threats.length > 0 },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      {brandRegistered && (
        <aside className="w-56 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold">Authentik</span>
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground truncate">{brandName}</span>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key === "threats") fetchThreats();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === item.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
                {item.badge && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <div className="text-[10px] text-muted-foreground/50 space-y-1">
              <div>Products: {products.length}</div>
              <div>Brand ID: {brandId.slice(0, 8)}...</div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar when no sidebar */}
        {!brandRegistered && (
          <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold tracking-tight">Authentik</span>
              </Link>
            </div>
          </nav>
        )}

        <div className={`${brandRegistered ? "p-8" : "max-w-7xl mx-auto px-6 py-8"}`}>
          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-3 rounded-lg border text-sm animate-fade-in flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-success/5 border-success/20 text-success"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={
                  message.type === "success"
                    ? "m4.5 12.75 6 6 9-13.5"
                    : "M6 18 18 6M6 6l12 12"
                } />
              </svg>
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">
                dismiss
              </button>
            </div>
          )}

          {/* Brand Registration */}
          {!brandRegistered ? (
            <div className="max-w-lg mx-auto mt-16">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Register Your Brand</h1>
                <p className="text-sm text-muted-foreground">
                  Create your brand profile to start protecting products with cryptographic authentication.
                </p>
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Brand Name</label>
                  <input
                    type="text"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    placeholder="e.g. Luxe Watches"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Domain</label>
                  <input
                    type="text"
                    value={brandForm.domain}
                    onChange={(e) => setBrandForm({ ...brandForm, domain: e.target.value })}
                    placeholder="e.g. luxewatches.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Industry</label>
                  <select
                    value={brandForm.industry}
                    onChange={(e) => setBrandForm({ ...brandForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  >
                    <option value="fashion">Fashion & Luxury</option>
                    <option value="electronics">Electronics</option>
                    <option value="pharmaceuticals">Pharmaceuticals</option>
                    <option value="food">Food & Beverage</option>
                    <option value="automotive">Automotive</option>
                    <option value="cosmetics">Cosmetics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button
                  onClick={registerBrand}
                  disabled={loading || !brandForm.name || !brandForm.domain}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Registering..." : "Register Brand"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === "overview" && (
                <div>
                  <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
                  <ScanAnalytics
                    scans={[]}
                    threats={threats}
                    totalScans={0}
                    totalProducts={products.length}
                  />
                </div>
              )}

              {/* Register Product */}
              {activeTab === "register" && (
                <div className="max-w-lg">
                  <h2 className="text-xl font-bold mb-1">Register New Product</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Each product gets a unique cryptographic certificate and QR code.
                  </p>
                  <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Name *</label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="e.g. Classic Chronograph 42mm"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SKU</label>
                        <input
                          type="text"
                          value={productForm.sku}
                          onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                          placeholder="LW-CC-42"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                        <input
                          type="text"
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          placeholder="Watches"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                      <textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Product description..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Manufacturing Location</label>
                      <input
                        type="text"
                        value={productForm.manufacturingLocation}
                        onChange={(e) => setProductForm({ ...productForm, manufacturingLocation: e.target.value })}
                        placeholder="Geneva, Switzerland"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <button
                      onClick={registerProduct}
                      disabled={loading || !productForm.name}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Registering..." : "Register Product"}
                    </button>
                  </div>
                </div>
              )}

              {/* Products */}
              {activeTab === "products" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                      Registered Products
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({products.length})
                      </span>
                    </h2>
                  </div>
                  {products.length === 0 ? (
                    <div className="text-center py-16 rounded-xl border border-dashed border-border">
                      <svg className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                      <p className="text-sm text-muted-foreground">No products registered yet.</p>
                      <button
                        onClick={() => setActiveTab("register")}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Register your first product
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((p) => (
                        <div
                          key={p.productId}
                          className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="font-medium truncate">{p.name}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <button
                                  onClick={() => copyCode(p.verificationCode)}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                  </svg>
                                  <span className="font-mono">
                                    {copiedCode === p.verificationCode ? "Copied!" : p.verificationCode}
                                  </span>
                                </button>
                                <span className="text-xs text-muted-foreground/50 font-mono truncate max-w-[180px]">
                                  {p.hash.slice(0, 20)}...
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/verify/${p.verificationCode}`}
                                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary hover:border-primary/30 transition-all"
                              >
                                Verify
                              </Link>
                              <a
                                href={`/api/products/qr?code=${p.verificationCode}&format=svg`}
                                target="_blank"
                                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary hover:border-primary/30 transition-all"
                              >
                                QR
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Provenance / Supply Chain */}
              {activeTab === "provenance" && (
                <div className="max-w-lg">
                  <h2 className="text-xl font-bold mb-1">Add Supply Chain Event</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Each event is hash-chained to the previous one, creating a tamper-evident provenance trail.
                  </p>
                  <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product</label>
                      {products.length > 0 ? (
                        <select
                          value={eventForm.productId}
                          onChange={(e) => setEventForm({ ...eventForm, productId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        >
                          <option value="">Select a product</option>
                          {products.map((p) => (
                            <option key={p.productId} value={p.productId}>
                              {p.name} ({p.verificationCode})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Register a product first.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event Type</label>
                      <select
                        value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      >
                        <option value="shipped">Shipped</option>
                        <option value="received">Received</option>
                        <option value="inspected">Inspected</option>
                        <option value="sold">Sold</option>
                        <option value="transferred">Transferred</option>
                        <option value="recalled">Recalled</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Actor / Handler</label>
                      <input
                        type="text"
                        value={eventForm.actor}
                        onChange={(e) => setEventForm({ ...eventForm, actor: e.target.value })}
                        placeholder="e.g. FedEx, Authorized Retailer NYC"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        placeholder="e.g. New York, NY"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <button
                      onClick={addProvenanceEvent}
                      disabled={loading || !eventForm.productId || !eventForm.actor}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Adding..." : "Add Event to Chain"}
                    </button>
                  </div>
                </div>
              )}

              {/* Threats */}
              {activeTab === "threats" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Threat Intelligence</h2>
                    <button
                      onClick={fetchThreats}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                  {threats.length === 0 ? (
                    <div className="text-center py-16 rounded-xl border border-dashed border-border">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-emerald-400">All Clear</p>
                      <p className="text-xs text-muted-foreground mt-1">No threats detected for your products.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {threats.map((t, i) => {
                        const severityColors: Record<string, string> = {
                          critical: "border-red-500/30 bg-red-500/5",
                          high: "border-orange-500/30 bg-orange-500/5",
                          medium: "border-amber-500/30 bg-amber-500/5",
                          low: "border-zinc-500/30 bg-zinc-500/5",
                        };
                        const dotColors: Record<string, string> = {
                          critical: "bg-red-500",
                          high: "bg-orange-500",
                          medium: "bg-amber-500",
                          low: "bg-zinc-500",
                        };
                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-xl border ${severityColors[t.severity]}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${dotColors[t.severity]}`} />
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {t.severity}
                              </span>
                              <span className="text-sm font-medium">
                                {t.type.replace(/_/g, " ")}
                              </span>
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {new Date(t.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t.details}</p>
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
