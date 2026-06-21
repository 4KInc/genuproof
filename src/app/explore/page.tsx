"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  productId: string;
  name: string;
  brandName: string;
  sku?: string;
  category?: string;
  description?: string;
  status: string;
  verificationCode: string;
  hash: string;
  createdAt: string;
  scanCount: number;
}

export default function ExplorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/explore?limit=50&status=active");
        const data = await res.json();
        if (res.ok) setProducts(data.products);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const filtered = filter === "all" ? products : products.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-14 border-b-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm font-medium tracking-wide uppercase">Authentik</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/verify" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Verify</Link>
              <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">
              Product Registry
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight">
              Verified <em className="text-accent">products.</em>
            </h1>
          </div>
          <div className="text-[12px] text-muted-foreground">
            {products.length} products registered
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-[11px] px-3 py-1.5 tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-[12px] text-muted-foreground py-16 text-center">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border py-16 text-center">
            <p className="text-[13px] text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.productId} className="border border-border bg-card p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                    {p.brandName}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] text-primary font-medium tracking-wide uppercase">Verified</span>
                  </div>
                </div>

                <h3 className="font-[family-name:var(--font-display)] text-lg mb-1 group-hover:text-primary transition-colors">
                  {p.name}
                </h3>

                {p.description && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                    {p.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mb-4">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  {p.category && <span>{p.category}</span>}
                  <span>{p.scanCount} scans</span>
                </div>

                <div className="font-mono text-[9px] text-muted-foreground/40 mb-4">
                  {p.hash}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/verify/${p.verificationCode}`}
                    className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground tracking-wide hover:bg-primary/90 transition-colors"
                  >
                    Verify
                  </Link>
                  <Link
                    href={`/qr/${p.verificationCode}`}
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
                  >
                    QR Certificate
                  </Link>
                  <Link
                    href={`/product/${p.productId}`}
                    className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
