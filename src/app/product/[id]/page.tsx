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

function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-8 w-64 mb-2" />
            <div className="skeleton h-3 w-80" />
          </div>
          <div className="skeleton h-7 w-16 rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border border-border rounded-lg p-5">
              <div className="skeleton h-3 w-20 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="border border-border bg-card rounded-lg p-6 mb-8">
          <div className="skeleton h-3 w-32 mb-4" />
          <div className="skeleton h-8 w-full mb-3" />
          <div className="skeleton h-8 w-full" />
        </div>
      </div>
    </div>
  );
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
          fetch(`/api/products/verify?productId=${id}&metadata=true`),
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

  if (loading) return <DetailSkeleton />;

  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <div className="max-w-[900px] mx-auto px-6 md:px-10 py-16 text-center">
          <svg className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <p className="text-[14px] text-muted-foreground mb-1">Product not found</p>
          <p className="text-[12px] text-muted-foreground/50 mb-4">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/dashboard" className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors">
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
          <div className={`text-[10px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full border ${
            product.status === "active"
              ? "text-primary border-primary/20 bg-primary/8"
              : product.status === "recalled"
              ? "text-destructive border-destructive/20 bg-destructive/8"
              : "text-accent border-accent/20 bg-accent/8"
          }`}>
            {product.status}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {[
            { label: "SKU", value: product.sku || "—", mono: true },
            { label: "Category", value: product.category || "—" },
            { label: "Registered", value: new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
            { label: "Total Scans", value: String(product.scanCount), mono: true },
            { label: "Verification Code", value: product.verificationCode, mono: true },
            { label: "Provenance Events", value: String(events.length), mono: true },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-4">
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                {item.label}
              </div>
              <div className={`text-[14px] ${item.mono ? "font-mono" : ""}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Crypto details */}
        <div className="border border-border bg-card rounded-lg p-6 mb-8">
          <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
            Cryptographic Identity
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Product Hash (SHA-256)</div>
              <div className="font-mono text-[10px] text-muted-foreground/70 break-all bg-secondary/50 border border-border rounded-md px-3 py-2">
                {product.hash}
              </div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">HMAC Signature</div>
              <div className="font-mono text-[10px] text-muted-foreground/70 break-all bg-secondary/50 border border-border rounded-md px-3 py-2">
                {product.signature}
              </div>
            </div>
          </div>
        </div>

        {/* QR + Actions */}
        <div className="grid md:grid-cols-[auto,1fr] gap-6 mb-8">
          <div className="border border-border bg-card rounded-lg p-6 flex flex-col items-center">
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
                className="text-[10px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all"
              >
                PNG
              </a>
              <a
                href={`/api/products/qr?code=${product.verificationCode}&format=svg`}
                download={`genuproof-${product.verificationCode}.svg`}
                className="text-[10px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all"
              >
                SVG
              </a>
              <Link
                href={`/qr/${product.verificationCode}`}
                className="text-[10px] px-3 py-1.5 border border-border rounded-md hover:bg-secondary transition-all"
              >
                Certificate
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card rounded-lg p-6">
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-3 font-medium">
              Quick Actions
            </div>
            <div className="space-y-2">
              <Link
                href={`/verify/${product.verificationCode}`}
                className="flex items-center justify-between py-2.5 px-3.5 border border-border rounded-md hover:bg-secondary transition-all text-[12px] group"
              >
                <span>Run consumer verification</span>
                <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href={`/qr/${product.verificationCode}`}
                className="flex items-center justify-between py-2.5 px-3.5 border border-border rounded-md hover:bg-secondary transition-all text-[12px] group"
              >
                <span>View printable QR certificate</span>
                <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href={`/api/products/certificate?productId=${product.productId}`}
                target="_blank"
                className="flex items-center justify-between py-2.5 px-3.5 border border-border rounded-md hover:bg-secondary transition-all text-[12px] group"
              >
                <span>Export JSON certificate</span>
                <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="mb-8">
          <button
            onClick={() => setShowScans(!showScans)}
            className="flex items-center justify-between w-full mb-4 cursor-pointer"
          >
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
              Scan History
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{scans.length} scans</span>
              <svg className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showScans ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>
          {showScans && (
            scans.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg py-8 text-center">
                <p className="text-[12px] text-muted-foreground/50">No scans recorded yet for this product.</p>
              </div>
            ) : (
              <div className="border border-border bg-card rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-4 gap-px bg-border text-[9px] tracking-[0.15em] uppercase text-muted-foreground min-w-[500px]">
                    <div className="bg-secondary/50 px-3 py-2.5">Time</div>
                    <div className="bg-secondary/50 px-3 py-2.5">Location</div>
                    <div className="bg-secondary/50 px-3 py-2.5">Country</div>
                    <div className="bg-secondary/50 px-3 py-2.5">Result</div>
                  </div>
                  {scans.map((scan, i) => (
                    <div key={i} className="grid grid-cols-4 gap-px bg-border text-[11px] min-w-[500px]">
                      <div className="bg-background px-3 py-2.5 font-mono text-muted-foreground tabular-nums">
                        {new Date(scan.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="bg-background px-3 py-2.5 text-muted-foreground">{scan.city}</div>
                      <div className="bg-background px-3 py-2.5 text-muted-foreground">{scan.country}</div>
                      <div className="bg-background px-3 py-2.5">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${scan.result === "authentic" ? "text-primary bg-primary/8" : "text-destructive bg-destructive/8"}`}>
                          {scan.result}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Provenance Chain */}
        {events.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
                Provenance Chain
              </div>
              <div className="text-[11px] text-muted-foreground">
                {events.length} events
              </div>
            </div>
            <div className="border border-border bg-card rounded-lg p-4 md:p-6">
              <ProvenanceTimeline events={events} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
