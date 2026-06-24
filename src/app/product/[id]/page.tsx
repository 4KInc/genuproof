"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { ProvenanceTimeline } from "@/components/provenance-timeline";

interface ProductData {
  productId: string;
  brandName: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  status: string;
  hash: string;
  signature: string;
  verificationCode: string;
  createdAt: string;
  scanCount: number;
}

interface EventData {
  type: string;
  actor: string;
  location?: string;
  timestamp: string;
  hash: string;
  previousHash: string;
  data?: Record<string, unknown>;
}

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<ProductData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [scans, setScans] = useState<Array<{ timestamp: string; country: string; city: string; result: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showScans, setShowScans] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [verifyRes, scansRes] = await Promise.all([
          fetch(`/api/products/verify?productId=${id}`),
          fetch(`/api/scans?productId=${id}&limit=20`),
        ]);
        const verifyData = await verifyRes.json();
        if (verifyData.product) {
          setProduct({
            ...verifyData.product,
            scanCount: verifyData.scanCount || 0,
          });
        }
        if (verifyData.events) setEvents(verifyData.events);

        const scansData = await scansRes.json();
        if (scansData.scans) setScans(scansData.scans);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[12px] text-muted-foreground">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[13px] text-muted-foreground mb-4">Product not found</div>
          <Link href="/dashboard" className="text-[12px] text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-2">
              {product.brandName}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-[13px] text-muted-foreground mt-2 max-w-md">{product.description}</p>
            )}
          </div>
          <div className={`text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 border ${
            product.status === "active"
              ? "text-primary border-primary/20 bg-primary/5"
              : product.status === "recalled"
              ? "text-destructive border-destructive/20 bg-destructive/5"
              : "text-accent border-accent/20 bg-accent/5"
          }`}>
            {product.status}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid md:grid-cols-3 gap-px bg-border mb-8">
          {[
            { label: "SKU", value: product.sku || "—", mono: true },
            { label: "Category", value: product.category || "—" },
            { label: "Registered", value: new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
            { label: "Total Scans", value: String(product.scanCount), mono: true },
            { label: "Verification Code", value: product.verificationCode, mono: true },
            { label: "Provenance Events", value: String(events.length), mono: true },
          ].map((item) => (
            <div key={item.label} className="bg-background p-5">
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                {item.label}
              </div>
              <div className={`text-[14px] ${item.mono ? "font-mono" : ""}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Crypto details */}
        <div className="border border-border bg-card p-6 mb-8">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Cryptographic Identity
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Product Hash (SHA-256)</div>
              <div className="font-mono text-[10px] text-muted-foreground/70 break-all bg-secondary/50 border border-border px-3 py-2">
                {product.hash}
              </div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">HMAC Signature</div>
              <div className="font-mono text-[10px] text-muted-foreground/70 break-all bg-secondary/50 border border-border px-3 py-2">
                {product.signature}
              </div>
            </div>
          </div>
        </div>

        {/* QR + Actions */}
        <div className="grid md:grid-cols-[auto,1fr] gap-8 mb-8">
          <div className="border border-border bg-card p-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/products/qr?code=${product.verificationCode}&format=png`}
              alt="QR Code"
              width={160}
              height={160}
              className="w-40 h-40"
            />
            <div className="mt-3 flex gap-2">
              <a
                href={`/api/products/qr?code=${product.verificationCode}&format=png`}
                download={`genuproof-${product.verificationCode}.png`}
                className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
              >
                PNG
              </a>
              <a
                href={`/api/products/qr?code=${product.verificationCode}&format=svg`}
                download={`genuproof-${product.verificationCode}.svg`}
                className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
              >
                SVG
              </a>
              <Link
                href={`/qr/${product.verificationCode}`}
                className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
              >
                Certificate
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Quick Actions
            </div>
            <div className="space-y-2">
              <Link
                href={`/verify/${product.verificationCode}`}
                className="flex items-center justify-between py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-[12px] group"
              >
                <span>Run consumer verification</span>
                <svg className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href={`/qr/${product.verificationCode}`}
                className="flex items-center justify-between py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-[12px] group"
              >
                <span>View printable QR certificate</span>
                <svg className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href={`/api/products/certificate?productId=${product.productId}`}
                target="_blank"
                className="flex items-center justify-between py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-[12px] group"
              >
                <span>Export JSON certificate</span>
                <svg className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Scan History */}
        {scans.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowScans(!showScans)}
              className="flex items-center justify-between w-full mb-4 cursor-pointer"
            >
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                Scan History
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{scans.length} scans</span>
                <svg className={`w-3 h-3 text-muted-foreground transition-transform ${showScans ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>
            {showScans && (
              <div className="border border-border bg-card">
                <div className="grid grid-cols-4 gap-px bg-border text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                  <div className="bg-secondary/50 px-3 py-2">Time</div>
                  <div className="bg-secondary/50 px-3 py-2">Location</div>
                  <div className="bg-secondary/50 px-3 py-2">Country</div>
                  <div className="bg-secondary/50 px-3 py-2">Result</div>
                </div>
                {scans.map((scan, i) => (
                  <div key={i} className="grid grid-cols-4 gap-px bg-border text-[11px]">
                    <div className="bg-background px-3 py-2 font-mono text-muted-foreground tabular-nums">
                      {new Date(scan.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="bg-background px-3 py-2 text-muted-foreground">{scan.city}</div>
                    <div className="bg-background px-3 py-2 text-muted-foreground">{scan.country}</div>
                    <div className="bg-background px-3 py-2">
                      <span className={`text-[10px] font-medium ${scan.result === "authentic" ? "text-primary" : "text-destructive"}`}>
                        {scan.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Provenance Chain */}
        {events.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                Provenance Chain
              </div>
              <div className="text-[11px] text-muted-foreground">
                {events.length} events
              </div>
            </div>
            <div className="border border-border bg-card p-4 md:p-6">
              <ProvenanceTimeline events={events} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
