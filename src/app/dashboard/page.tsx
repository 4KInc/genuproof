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
  country?: string;
  city?: string;
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

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  overview: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  ),
  register: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  products: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  provenance: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  threats: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
};

interface ExistingBrand {
  id: string;
  name: string;
  domain: string;
  industry: string;
  createdAt: string;
}

// Skeleton components for loading states
function StatSkeleton() {
  return (
    <div className="bg-background p-5">
      <div className="skeleton h-3 w-16 mb-2" />
      <div className="skeleton h-7 w-12" />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="py-5 border-b border-border px-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-4 w-14" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="skeleton h-7 w-12" />
          <div className="skeleton h-7 w-10" />
          <div className="skeleton h-7 w-14" />
        </div>
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, onDismiss }: { message: { type: "success" | "error"; text: string }; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-reveal max-w-sm shadow-lg rounded-lg px-4 py-3 border text-[13px] flex items-center gap-3 ${
      message.type === "success"
        ? "border-primary/20 bg-card text-primary"
        : "border-destructive/20 bg-card text-destructive"
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${message.type === "success" ? "bg-primary" : "bg-destructive"}`} />
      <span className="flex-1">{message.text}</span>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const [brandId, setBrandId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandRegistered, setBrandRegistered] = useState(false);
  const [existingBrands, setExistingBrands] = useState<ExistingBrand[]>([]);
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [productsLoading, setProductsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const registerBrand = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brandForm) });
      const data = await res.json();
      if (res.ok) { setBrandId(data.id); setBrandName(data.name); setBrandRegistered(true); setMessage({ type: "success", text: `Brand "${data.name}" registered successfully` }); }
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
      if (res.ok) { setProducts(p => [{ ...data, name: productForm.name }, ...p]); setProductForm({ name: "", sku: "", category: "", description: "", manufacturingLocation: "" }); setMessage({ type: "success", text: `Product registered. Code: ${data.verificationCode}` }); }
      else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Failed to register" }); }
    finally { setLoading(false); }
  };

  const addEvent = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await fetch("/api/products/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
      const data = await res.json();
      if (res.ok) { setMessage({ type: "success", text: `Event added to chain. Hash: ${data.hash.slice(0, 16)}...` }); setEventForm({ ...eventForm, actor: "", location: "" }); }
      else setMessage({ type: "error", text: data.error });
    } catch { setMessage({ type: "error", text: "Failed" }); }
    finally { setLoading(false); }
  };

  const fetchThreats = useCallback(async () => {
    if (!brandId) return;
    try { const res = await fetch(`/api/threats?brandId=${brandId}`); const data = await res.json(); if (res.ok) setThreats(data.threats); } catch {}
  }, [brandId]);

  useEffect(() => { if (brandRegistered) fetchThreats(); }, [brandRegistered, fetchThreats]);

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

  const loadBrandProducts = useCallback(async (bid: string) => {
    setProductsLoading(true);
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
    finally { setProductsLoading(false); }
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

  const inputClass = "w-full px-3.5 py-2.5 text-[13px] bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40";
  const labelClass = "text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5 block font-medium";
  const btnClass = "w-full py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide rounded-md hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";

  return (
    <div className="min-h-screen flex">
      {/* Toast notification */}
      {message && <Toast message={message} onDismiss={() => setMessage(null)} />}

      {/* Sidebar */}
      {brandRegistered && (
        <aside className={`${sidebarCollapsed ? "w-16" : "w-56"} border-r border-border flex flex-col bg-card/50 transition-all duration-200 shrink-0`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 border-[1.5px] border-primary rounded-md flex items-center justify-center bg-primary/5">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                {!sidebarCollapsed && <span className="text-[12px] font-semibold tracking-wide uppercase">GenuProof</span>}
              </Link>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-secondary"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            </div>
            {!sidebarCollapsed && (
              <div className="mt-3 flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] text-muted-foreground truncate">{brandName}</span>
              </div>
            )}
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === "threats") fetchThreats(); }}
                className={`w-full text-left px-3 py-2.5 text-[12px] tracking-wide transition-all rounded-md flex items-center gap-2.5 ${
                  activeTab === tab
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
                title={sidebarCollapsed ? TAB_LABELS[tab] : undefined}
              >
                <span className={activeTab === tab ? "text-primary" : "text-muted-foreground"}>
                  {TAB_ICONS[tab]}
                </span>
                {!sidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    {TAB_LABELS[tab]}
                    {tab === "threats" && threats.length > 0 && (
                      <span className="min-w-5 h-5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium flex items-center justify-center px-1.5">
                        {threats.length}
                      </span>
                    )}
                    {tab === "products" && products.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">{products.length}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex flex-col gap-1.5">
                <Link href="/analytics" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  Analytics
                </Link>
                <Link href="/explore" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  Explore
                </Link>
                <button
                  onClick={() => { setBrandRegistered(false); setProducts([]); setThreats([]); setShowNewBrandForm(false); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  Switch brand
                </button>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="text-[10px] text-muted-foreground/40 font-mono">{brandId.slice(0, 12)}...</div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {!brandRegistered && <SiteNav />}

        <div className={brandRegistered ? "p-6 md:p-8 max-w-4xl" : "max-w-lg mx-auto px-6 py-16"}>

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

              {brandsLoading ? (
                <div className="animate-reveal delay-3 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="skeleton h-5 w-36 mb-2" />
                          <div className="skeleton h-3 w-48" />
                        </div>
                        <div className="skeleton h-4 w-4 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : existingBrands.length > 0 && !showNewBrandForm ? (
                <div className="animate-reveal delay-3">
                  <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-3 font-medium">
                    Your Brands ({existingBrands.length})
                  </div>
                  <div className="space-y-2">
                    {existingBrands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => selectBrand(brand)}
                        className="w-full text-left p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-primary/3 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[14px] font-medium group-hover:text-primary transition-colors">
                              {brand.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                              <span>{brand.domain}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="capitalize">{brand.industry}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{new Date(brand.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowNewBrandForm(true)}
                    className="mt-4 text-[12px] text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Register a new brand
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-reveal delay-3">
                  {existingBrands.length > 0 && (
                    <button
                      onClick={() => setShowNewBrandForm(false)}
                      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                      Back to brand list
                    </button>
                  )}
                  <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1 font-medium">
                    New Brand
                  </div>
                  <div className="space-y-4 border border-border rounded-lg p-5">
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
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === "overview" && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">Overview</h2>
                    <span className="text-[11px] text-muted-foreground/50">
                      Last updated: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <ScanAnalytics
                    brandId={brandId}
                    threats={threats}
                    totalScans={stats?.totalScans || 0}
                    totalProducts={stats?.productCount || products.length}
                  />
                  {stats && (
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      {[
                        { label: "Active", value: stats.activeProducts, color: "text-primary", icon: (
                          <svg className="w-4 h-4 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )},
                        { label: "Recalled", value: stats.recalledProducts, color: "text-destructive", icon: (
                          <svg className="w-4 h-4 text-destructive/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )},
                        { label: "Alerts", value: stats.unresolvedThreats, color: stats.unresolvedThreats > 0 ? "text-warning" : "text-foreground", icon: (
                          <svg className="w-4 h-4 text-warning/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                        )},
                      ].map((s) => (
                        <div key={s.label} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{s.label}</div>
                            {s.icon}
                          </div>
                          <div className={`font-[family-name:var(--font-display)] text-2xl ${s.color}`}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8">
                    <LiveThreats brandId={brandId} />
                  </div>

                  <div className="mt-8">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3 font-medium">
                      Recent Activity
                    </div>
                    <ActivityFeed brandId={brandId} />
                  </div>
                </div>
              )}

              {/* Register Product */}
              {activeTab === "register" && (
                <div className="max-w-md animate-fade-in">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Register Product</h2>
                  <p className="text-[12px] text-muted-foreground mb-6">Each product receives a unique cryptographic certificate.</p>
                  <div className="space-y-4 border border-border rounded-lg p-6">
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
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Registering...
                        </span>
                      ) : "Register Product"}
                    </button>
                  </div>
                </div>
              )}

              {/* Products */}
              {activeTab === "products" && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">
                      Products <span className="text-muted-foreground text-lg ml-1">({products.length})</span>
                    </h2>
                    <button onClick={() => setActiveTab("register")} className="text-[12px] px-3.5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Product
                    </button>
                  </div>
                  {productsLoading ? (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {[1, 2, 3, 4].map(i => <ProductSkeleton key={i} />)}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg py-16 text-center">
                      <svg className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                      <p className="text-[14px] text-muted-foreground mb-1">No products registered yet</p>
                      <p className="text-[12px] text-muted-foreground/60 mb-4">Register your first product to get started.</p>
                      <button onClick={() => setActiveTab("register")} className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors">
                        Register your first product
                      </button>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {products.map((p, idx) => {
                      const statusColor = p.status === "active" ? "text-primary bg-primary/8 border-primary/15"
                        : p.status === "recalled" ? "text-destructive bg-destructive/8 border-destructive/15"
                        : "text-accent bg-accent/8 border-accent/15";
                      return (
                        <div key={p.productId} className={`py-4 px-5 ${idx > 0 ? "border-t border-border" : ""} hover:bg-secondary/30 transition-colors cursor-pointer`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5">
                                <span className="text-[14px] font-medium">{p.name}</span>
                                <span className={`text-[9px] tracking-wide uppercase font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                  {p.status || "active"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <button onClick={() => copyCode(p.verificationCode)} className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer group/code">
                                  <svg className="w-3 h-3 opacity-40 group-hover/code:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                  </svg>
                                  {copiedCode === p.verificationCode ? (
                                    <span className="text-primary">Copied!</span>
                                  ) : p.verificationCode}
                                </button>
                                {p.sku && (
                                  <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                    {p.sku}
                                  </span>
                                )}
                                {p.category && (
                                  <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                    {p.category}
                                  </span>
                                )}
                                {(p.scanCount ?? 0) > 0 && (
                                  <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                    {p.scanCount} scans
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              <Link href={`/verify/${p.verificationCode}?brand=${brandId}`} className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all hover:border-border/80">View</Link>
                              <Link href={`/qr/${p.verificationCode}`} className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all hover:border-border/80">QR</Link>
                              <Link href={`/product/${p.productId}`} className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all hover:border-border/80">Detail</Link>
                              <a href={`/api/products/certificate?code=${p.verificationCode}`} target="_blank" className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all hover:border-border/80">JSON</a>
                              {p.status === "active" && (
                                <>
                                  <button onClick={() => transferProduct(p.productId, p.name)} disabled={loading} className="text-[11px] px-3 py-1.5 border border-accent/20 text-accent rounded-md hover:bg-accent/5 transition-all cursor-pointer">Transfer</button>
                                  <button onClick={() => recallProduct(p.productId, p.name)} disabled={loading} className="text-[11px] px-3 py-1.5 border border-destructive/20 text-destructive rounded-md hover:bg-destructive/5 transition-all cursor-pointer">Recall</button>
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
                <div className="max-w-md animate-fade-in">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Supply Chain Event</h2>
                  <p className="text-[12px] text-muted-foreground mb-6">Each event is hash-chained to the previous one.</p>
                  <div className="space-y-4 border border-border rounded-lg p-6">
                    <div>
                      <label className={labelClass}>Product</label>
                      {products.length > 0 ? (
                        <select value={eventForm.productId} onChange={e => setEventForm({...eventForm, productId: e.target.value})} className={inputClass}>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.productId} value={p.productId}>{p.name} ({p.verificationCode})</option>)}
                        </select>
                      ) : (
                        <div className="text-[12px] text-muted-foreground py-3 px-4 bg-secondary/50 rounded-md border border-border">
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                            Register a product first to add supply chain events.
                          </span>
                        </div>
                      )}
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
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Adding...
                        </span>
                      ) : "Add Event to Chain"}
                    </button>
                  </div>
                </div>
              )}

              {/* Threats */}
              {activeTab === "threats" && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">Threats</h2>
                    <button onClick={fetchThreats} className="text-[11px] px-3.5 py-2 border border-border rounded-md hover:bg-secondary transition-all cursor-pointer flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                      Refresh
                    </button>
                  </div>

                  {/* Summary cards */}
                  {threats.length > 0 && (() => {
                    const critical = threats.filter((t) => t.severity === "critical").length;
                    const high = threats.filter((t) => t.severity === "high").length;
                    const medium = threats.filter((t) => t.severity === "medium").length;
                    const low = threats.filter((t) => t.severity === "low").length;
                    const uniqueLocations = new Set(threats.filter((t) => t.country && t.country !== "Unknown").map((t) => `${t.city},${t.country}`)).size;
                    const uniqueProducts = new Set(threats.filter((t) => t.productId).map((t) => t.productId)).size;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-1">Critical / High</div>
                          <div className="text-xl font-[family-name:var(--font-display)] text-destructive">{critical + high}</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-1">Medium / Low</div>
                          <div className="text-xl font-[family-name:var(--font-display)]">{medium + low}</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-1">Affected Products</div>
                          <div className="text-xl font-[family-name:var(--font-display)]">{uniqueProducts}</div>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-4">
                          <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-1">Locations</div>
                          <div className="text-xl font-[family-name:var(--font-display)]">{uniqueLocations}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {threats.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg py-16 text-center">
                      <svg className="w-10 h-10 text-primary/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[14px] text-primary font-medium">All Clear</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground/60">No threats detected for your brand.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                      {threats.map((t, i) => {
                        const sevBg = t.severity === "critical" ? "border-l-destructive bg-destructive/3" : t.severity === "high" ? "border-l-destructive/60 bg-destructive/2" : t.severity === "medium" ? "border-l-warning bg-warning/3" : "border-l-muted-foreground/30";
                        const dotColor = t.severity === "critical" || t.severity === "high" ? "bg-destructive" : t.severity === "medium" ? "bg-warning" : "bg-muted-foreground";
                        const productName = t.productId ? products.find((p) => p.productId === t.productId)?.name : undefined;
                        const hasLocation = t.country && t.country !== "Unknown";
                        const cleanDetails = t.details
                          .replace(/Anomaly detected:\s*/i, "")
                          .replace(/\{.*?\}/g, "")
                          .trim() || t.type.replace(/_/g, " ");
                        return (
                          <div key={i} className={`px-5 py-4 border-b border-border border-l-2 ${sevBg} transition-colors hover:bg-secondary/20`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                              <span className="text-[10px] tracking-wide uppercase font-semibold text-muted-foreground">{t.severity}</span>
                              <span className="text-[12px] font-medium">{t.type.replace(/_/g, " ")}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">{new Date(t.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[12px] text-muted-foreground ml-4 mb-2 leading-relaxed">{cleanDetails}</p>
                            <div className="flex items-center gap-2 ml-4 flex-wrap">
                              {productName && (
                                <span className="text-[10px] px-2.5 py-0.5 bg-primary/5 border border-primary/10 text-foreground/70 rounded-full">{productName}</span>
                              )}
                              {hasLocation && (
                                <span className="text-[10px] px-2.5 py-0.5 bg-primary/5 border border-primary/10 text-foreground/70 rounded-full">{t.city}, {t.country}</span>
                              )}
                              {t.productId && !productName && (
                                <span className="text-[10px] px-2.5 py-0.5 bg-primary/5 border border-primary/10 text-foreground/70 rounded-full font-mono">{t.productId.slice(0, 12)}...</span>
                              )}
                            </div>
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
