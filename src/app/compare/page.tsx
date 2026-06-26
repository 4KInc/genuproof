"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

interface ProductData {
  authentic: boolean;
  product?: {
    productId: string;
    brandName: string;
    name: string;
    sku?: string;
    category?: string;
    status: string;
    hash: string;
    createdAt: string;
    verificationCode: string;
  };
  events?: Array<{ type: string; actor: string; location?: string; timestamp: string; hash: string }>;
  scanCount: number;
  certificate?: { signatureValid: boolean; chainIntegrity: boolean; hash: string };
}

function ProductColumn({ data, label }: { data: ProductData | null; label: string }) {
  if (!data || !data.product) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center flex-1">
        <svg className="w-8 h-8 text-muted-foreground/15 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
        <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1 font-medium">{label}</div>
        <p className="text-[12px] text-muted-foreground/50">Enter a verification code above</p>
      </div>
    );
  }

  const p = data.product;
  const cert = data.certificate;

  return (
    <div className="border border-border rounded-lg flex-1 overflow-hidden">
      <div className={`h-1 ${data.authentic ? "bg-primary" : "bg-destructive"}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-medium">{label}</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${data.authentic ? "bg-primary" : "bg-destructive"}`} />
            <span className={`text-[10px] font-semibold tracking-wide uppercase ${data.authentic ? "text-primary" : "text-destructive"}`}>
              {data.authentic ? "Authentic" : "Failed"}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {[
            { l: "Brand", v: p.brandName },
            { l: "Product", v: p.name },
            { l: "SKU", v: p.sku || "—" },
            { l: "Category", v: p.category || "—" },
            { l: "Status", v: p.status },
            { l: "Registered", v: new Date(p.createdAt).toLocaleDateString() },
            { l: "Scans", v: String(data.scanCount) },
            { l: "Events", v: String(data.events?.length || 0) },
          ].map((r) => (
            <div key={r.l} className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-muted-foreground">{r.l}</span>
              <span className="text-[12px] font-medium">{r.v}</span>
            </div>
          ))}
        </div>

        {cert && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-2 font-medium">Cryptographic Verification</div>
            {[
              { l: "Signature", v: cert.signatureValid },
              { l: "Chain Integrity", v: cert.chainIntegrity },
            ].map((c) => (
              <div key={c.l} className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">{c.l}</span>
                <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${c.v ? "text-primary bg-primary/8" : "text-destructive bg-destructive/8"}`}>
                  {c.v ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
            <div className="mt-2">
              <div className="font-mono text-[8px] text-muted-foreground/40 break-all bg-secondary/50 px-2.5 py-2 rounded-md border border-border">
                {cert.hash}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Link href={`/verify/${p.verificationCode}`} className="text-[10px] px-3 py-1.5 bg-primary text-primary-foreground tracking-wide rounded-md hover:bg-primary/90 transition-all">Verify</Link>
          <Link href={`/product/${p.productId}`} className="text-[10px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all">Detail</Link>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");
  const [dataA, setDataA] = useState<ProductData | null>(null);
  const [dataB, setDataB] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    if (!codeA.trim() || !codeB.trim()) return;
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/products/verify?code=${codeA.trim()}`),
        fetch(`/api/products/verify?code=${codeB.trim()}`),
      ]);
      setDataA(await resA.json());
      setDataB(await resB.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && codeA.trim() && codeB.trim()) compare();
  };

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Tools</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight mb-3">
          Compare <em className="text-accent">products.</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mb-8 max-w-md">
          Verify and compare two products side by side. Useful for checking if a product matches its claimed certificate.
        </p>

        {/* Input */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={codeA}
            onChange={(e) => setCodeA(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="First verification code"
            className="flex-1 px-3.5 py-2.5 text-[13px] font-mono bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center justify-center text-[11px] text-muted-foreground/40 sm:px-2 font-medium">vs</div>
          <input
            type="text"
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Second verification code"
            className="flex-1 px-3.5 py-2.5 text-[13px] font-mono bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
          />
          <button
            onClick={compare}
            disabled={loading || !codeA.trim() || !codeB.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide rounded-md hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.98]"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {/* Results */}
        <div className="flex flex-col md:flex-row gap-4">
          <ProductColumn data={dataA} label="Product A" />
          <ProductColumn data={dataB} label="Product B" />
        </div>
      </div>
    </div>
  );
}
