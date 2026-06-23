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
      <div className="border border-dashed border-border p-8 text-center flex-1">
        <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">{label}</div>
        <p className="text-[12px] text-muted-foreground/50">Enter a verification code above</p>
      </div>
    );
  }

  const p = data.product;
  const cert = data.certificate;

  return (
    <div className="border border-border flex-1">
      <div className={`h-1 ${data.authentic ? "bg-primary" : "bg-destructive"}`} />
      <div className="p-5">
        <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3">{label}</div>

        <div className="flex items-center gap-1.5 mb-4">
          <div className={`w-1.5 h-1.5 rounded-full ${data.authentic ? "bg-primary" : "bg-destructive"}`} />
          <span className={`text-[10px] font-medium tracking-wide uppercase ${data.authentic ? "text-primary" : "text-destructive"}`}>
            {data.authentic ? "Authentic" : "Failed"}
          </span>
        </div>

        <div className="space-y-3 mb-5">
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
            <div key={r.l} className="flex justify-between items-baseline">
              <span className="text-[10px] text-muted-foreground">{r.l}</span>
              <span className="text-[12px]">{r.v}</span>
            </div>
          ))}
        </div>

        {cert && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-2">Crypto</div>
            {[
              { l: "Signature", v: cert.signatureValid },
              { l: "Chain", v: cert.chainIntegrity },
            ].map((c) => (
              <div key={c.l} className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">{c.l}</span>
                <span className={`text-[9px] font-medium uppercase ${c.v ? "text-primary" : "text-destructive"}`}>
                  {c.v ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
            <div className="mt-2">
              <div className="font-mono text-[8px] text-muted-foreground/40 break-all bg-secondary/50 px-2 py-1.5 border border-border">
                {cert.hash}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-1.5">
          <Link href={`/verify/${p.verificationCode}`} className="text-[9px] px-2.5 py-1 bg-primary text-primary-foreground tracking-wide">Verify</Link>
          <Link href={`/product/${p.productId}`} className="text-[9px] px-2.5 py-1 border border-border hover:bg-secondary transition-colors">Detail</Link>
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
            placeholder="First verification code"
            className="flex-1 px-3 py-2.5 text-[13px] font-mono bg-card border border-border focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="flex items-center justify-center text-[11px] text-muted-foreground/40 sm:px-2">vs</div>
          <input
            type="text"
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
            placeholder="Second verification code"
            className="flex-1 px-3 py-2.5 text-[13px] font-mono bg-card border border-border focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button
            onClick={compare}
            disabled={loading || !codeA.trim() || !codeB.trim()}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer"
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
