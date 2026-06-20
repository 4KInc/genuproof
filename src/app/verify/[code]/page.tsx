"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VerificationBadge } from "@/components/verification-badge";
import { ProvenanceTimeline } from "@/components/provenance-timeline";

interface VerificationResult {
  authentic: boolean;
  product?: {
    productId: string;
    brandName: string;
    name: string;
    sku?: string;
    category?: string;
    description?: string;
    imageUrl?: string;
    status: string;
    createdAt: string;
    hash: string;
  };
  events?: Array<{
    type: string;
    actor: string;
    location?: string;
    timestamp: string;
    hash: string;
    previousHash: string;
    data?: Record<string, unknown>;
  }>;
  warnings?: string[];
  scanCount: number;
  certificate?: {
    hash: string;
    signatureValid: boolean;
    chainIntegrity: boolean;
  };
  error?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Animated verification stages
    const timers = [
      setTimeout(() => setStage(1), 400),   // Checking signature
      setTimeout(() => setStage(2), 900),   // Verifying chain
      setTimeout(() => setStage(3), 1400),  // Querying database
    ];

    async function verify() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}`);
        const data = await res.json();
        // Wait for animation to finish
        setTimeout(() => {
          setResult(data);
          setStage(4);
          setLoading(false);
        }, 1800);
      } catch {
        setTimeout(() => {
          setResult({ authentic: false, scanCount: 0, error: "Verification service unavailable" });
          setLoading(false);
        }, 1800);
      }
    }
    verify();

    return () => timers.forEach(clearTimeout);
  }, [code]);

  if (loading) {
    const stages = [
      "Initializing verification...",
      "Checking cryptographic signature...",
      "Verifying hash chain integrity...",
      "Querying product database...",
    ];

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="space-y-3">
            {stages.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  i <= stage ? "opacity-100" : "opacity-20"
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  i < stage
                    ? "bg-success/20"
                    : i === stage
                    ? "bg-primary/20"
                    : "bg-secondary"
                }`}>
                  {i < stage ? (
                    <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : i === stage ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result || result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <VerificationBadge
            authentic={false}
            brandName="Unknown"
            productName="Unverified Product"
            hash="N/A"
          />
          <p className="text-center text-sm text-muted-foreground mt-4">
            {result?.error || "This verification code is not recognized."}
          </p>
          <div className="text-center mt-4">
            <Link href="/" className="text-sm text-primary hover:underline">
              Return to Authentik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { authentic, product, events, warnings, scanCount, certificate } = result;

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-sm font-medium group-hover:text-primary transition-colors">Authentik</span>
        </Link>

        {/* Verification Badge */}
        {product && (
          <div className="animate-fade-in mb-8">
            <VerificationBadge
              authentic={authentic}
              brandName={product.brandName}
              productName={product.name}
              hash={product.hash}
            />
          </div>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="rounded-xl p-4 mb-6 border border-warning/20 bg-warning/5 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
              </svg>
              <span className="text-sm font-medium text-warning">Security Warnings</span>
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground ml-6 mt-1">{w}</p>
            ))}
          </div>
        )}

        {/* Details Grid */}
        {product && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Product Info */}
            <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Product Details</h2>
              <div className="space-y-3">
                {[
                  { label: "Product", value: product.name },
                  { label: "Brand", value: product.brandName },
                  ...(product.sku ? [{ label: "SKU", value: product.sku, mono: true }] : []),
                  ...(product.category ? [{ label: "Category", value: product.category }] : []),
                  { label: "Registered", value: new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                  { label: "Total Scans", value: String(scanCount), mono: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-sm ${(row as { mono?: boolean }).mono ? "font-mono" : "font-medium"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                    product.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : product.status === "recalled"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {product.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Certificate */}
            {certificate && (
              <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                  Cryptographic Certificate
                </h2>
                <div className="space-y-3">
                  {[
                    { label: "HMAC Signature", valid: certificate.signatureValid },
                    { label: "Hash Chain", valid: certificate.chainIntegrity },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{check.label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${check.valid ? "bg-emerald-400" : "bg-red-400"}`} />
                        <span className={`text-[10px] font-medium uppercase tracking-wider ${
                          check.valid ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {check.valid ? "Verified" : "Failed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    SHA-256 Fingerprint
                  </span>
                  <p className="text-[11px] font-mono text-muted-foreground/70 break-all mt-1.5 bg-secondary/30 rounded-md px-2.5 py-2 leading-relaxed">
                    {certificate.hash}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Provenance Timeline */}
        {events && events.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Provenance Chain
              <span className="ml-2 text-primary">{events.length} events</span>
            </h2>
            <ProvenanceTimeline events={events} />
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Powered by Authentik
          </Link>
        </div>
      </div>
    </div>
  );
}
