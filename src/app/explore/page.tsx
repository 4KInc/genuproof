"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

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

function CardSkeleton() {
  return (
    <div className="border border-border bg-card rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="skeleton h-5 w-3/4 mb-2" />
      <div className="skeleton h-3 w-full mb-1" />
      <div className="skeleton h-3 w-2/3 mb-4" />
      <div className="flex gap-3 mb-4">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-14" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-7 w-16" />
        <div className="skeleton h-7 w-24" />
        <div className="skeleton h-7 w-16" />
      </div>
    </div>
  );
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
      <SiteNav />

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
          <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
            <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            {products.length} products
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-[11px] px-3.5 py-1.5 tracking-wide transition-all whitespace-nowrap cursor-pointer rounded-full ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-secondary hover:border-border/80"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-16 text-center">
            <svg className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-[14px] text-muted-foreground mb-1">No products found</p>
            <p className="text-[12px] text-muted-foreground/50">
              {filter !== "all" ? "Try selecting a different category." : "No verified products registered yet."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.productId} className="border border-border bg-card rounded-lg p-6 group hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-medium">
                    {p.brandName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] text-primary font-semibold tracking-wide uppercase">Verified</span>
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

                <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground/50 mb-4">
                  {p.sku && (
                    <span className="font-mono flex items-center gap-1">
                      {p.sku}
                    </span>
                  )}
                  {p.category && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                      <span>{p.category}</span>
                    </>
                  )}
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                  <span>{p.scanCount} scans</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/verify/${p.verificationCode}`}
                    className="text-[11px] px-3 py-1.5 bg-primary text-primary-foreground tracking-wide rounded-md hover:bg-primary/90 transition-all"
                  >
                    Verify
                  </Link>
                  <Link
                    href={`/qr/${p.verificationCode}`}
                    className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all"
                  >
                    QR Certificate
                  </Link>
                  <Link
                    href={`/product/${p.productId}`}
                    className="text-[11px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all"
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
