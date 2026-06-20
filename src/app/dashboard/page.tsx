"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

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

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const THREAT_TYPE_LABELS: Record<string, string> = {
  duplicate_scan: "Duplicate Scan",
  geographic_anomaly: "Geographic Anomaly",
  burst_scan: "Burst Scan",
  invalid_code: "Invalid Code",
  domain_impersonation: "Domain Impersonation",
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"register" | "products" | "threats">("register");
  const [brandId, setBrandId] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [brandRegistered, setBrandRegistered] = useState(false);

  // Brand registration form
  const [brandForm, setBrandForm] = useState({
    name: "",
    domain: "",
    industry: "fashion",
  });

  // Product registration form
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    manufacturingLocation: "",
  });

  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        setMessage({ type: "success", text: `Brand "${data.name}" registered successfully` });
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
        setProducts((prev) => [
          { ...data, name: productForm.name },
          ...prev,
        ]);
        setProductForm({ name: "", sku: "", category: "", description: "", manufacturingLocation: "" });
        setMessage({ type: "success", text: `Product registered with code: ${data.verificationCode}` });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to register product" });
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
      // Silently fail
    }
  }, [brandId]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">Authentik</span>
          </Link>
          {brandRegistered && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success" />
              {brandName}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm animate-fade-in ${
              message.type === "success"
                ? "bg-success/5 border-success/20 text-success"
                : "bg-destructive/5 border-destructive/20 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Brand Registration */}
        {!brandRegistered ? (
          <div className="max-w-lg mx-auto mt-12">
            <h1 className="text-2xl font-bold mb-2">Register Your Brand</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Create your brand profile to start registering and protecting products.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Brand Name</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="e.g. Luxe Watches"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Domain</label>
                <input
                  type="text"
                  value={brandForm.domain}
                  onChange={(e) => setBrandForm({ ...brandForm, domain: e.target.value })}
                  placeholder="e.g. luxewatches.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Industry</label>
                <select
                  value={brandForm.industry}
                  onChange={(e) => setBrandForm({ ...brandForm, industry: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Registering..." : "Register Brand"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit mb-8">
              {(["register", "products", "threats"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "threats") fetchThreats();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "register"
                    ? "Register Product"
                    : tab === "products"
                    ? `Products (${products.length})`
                    : `Threats (${threats.length})`}
                </button>
              ))}
            </div>

            {/* Register Product Tab */}
            {activeTab === "register" && (
              <div className="max-w-lg">
                <h2 className="text-xl font-bold mb-6">Register New Product</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. Classic Chronograph 42mm"
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">SKU</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        placeholder="e.g. LW-CC-42"
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                      <input
                        type="text"
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        placeholder="e.g. Watches"
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Product description..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Manufacturing Location</label>
                    <input
                      type="text"
                      value={productForm.manufacturingLocation}
                      onChange={(e) => setProductForm({ ...productForm, manufacturingLocation: e.target.value })}
                      placeholder="e.g. Geneva, Switzerland"
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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

            {/* Products Tab */}
            {activeTab === "products" && (
              <div>
                <h2 className="text-xl font-bold mb-6">Registered Products</h2>
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No products registered yet.</p>
                    <button
                      onClick={() => setActiveTab("register")}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Register your first product
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((p) => (
                      <div
                        key={p.productId}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{p.name}</h3>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="font-mono">Code: {p.verificationCode}</span>
                              <span className="font-mono truncate max-w-[200px]">
                                Hash: {p.hash.slice(0, 16)}...
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/verify/${p.verificationCode}`}
                              className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors"
                            >
                              Verify
                            </Link>
                            <a
                              href={`/api/products/qr?code=${p.verificationCode}`}
                              target="_blank"
                              className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors"
                            >
                              QR Code
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Threats Tab */}
            {activeTab === "threats" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Threat Intelligence</h2>
                  <button
                    onClick={fetchThreats}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {threats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No threats detected. Your products are safe.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threats.map((t, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border ${SEVERITY_COLORS[t.severity]}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase">
                                {t.severity}
                              </span>
                              <span className="text-sm font-medium">
                                {THREAT_TYPE_LABELS[t.type] || t.type}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.details}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(t.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {t.productId && (
                            <Link
                              href={`/verify?pid=${t.productId}`}
                              className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50 transition-colors"
                            >
                              View Product
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
