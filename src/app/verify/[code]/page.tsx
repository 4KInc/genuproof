"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

const EVENT_ICONS: Record<string, string> = {
  manufactured: "M",
  shipped: "S",
  received: "R",
  inspected: "I",
  sold: "$",
  transferred: "T",
  recalled: "!",
  custom: "*",
};

export default function VerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChain, setShowChain] = useState(false);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}`);
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({ authentic: false, scanCount: 0, error: "Verification service unavailable" });
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="mt-4 text-muted-foreground">Verifying product authenticity...</p>
        </div>
      </div>
    );
  }

  if (!result || result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
          <p className="text-muted-foreground mb-6">
            {result?.error || "This verification code is not recognized. The product may be counterfeit."}
          </p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Return to Authentik
          </Link>
        </div>
      </div>
    );
  }

  const { authentic, product, events, warnings, scanCount, certificate } = result;

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-sm font-medium">Authentik</span>
        </Link>

        {/* Status Banner */}
        <div
          className={`rounded-xl p-6 mb-6 border ${
            authentic
              ? "bg-success/5 border-success/20"
              : "bg-destructive/5 border-destructive/20"
          } animate-fade-in`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                authentic ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {authentic ? (
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${authentic ? "text-success" : "text-destructive"}`}>
                {authentic ? "Authentic Product" : "Verification Failed"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {authentic
                  ? "This product has been verified as genuine by the manufacturer."
                  : "This product could not be verified. It may be counterfeit."}
              </p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="rounded-xl p-4 mb-6 border border-warning/20 bg-warning/5 animate-fade-in stagger-1" style={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
              </svg>
              <span className="text-sm font-medium text-warning">Warnings</span>
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground ml-6">{w}</p>
            ))}
          </div>
        )}

        {/* Product Info */}
        {product && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6 animate-fade-in stagger-2" style={{ opacity: 0 }}>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Product Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Product</span>
                <span className="text-sm font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Brand</span>
                <span className="text-sm font-medium">{product.brandName}</span>
              </div>
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">SKU</span>
                  <span className="text-sm font-mono">{product.sku}</span>
                </div>
              )}
              {product.category && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm">{product.category}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  product.status === "active"
                    ? "bg-success/10 text-success"
                    : product.status === "recalled"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning"
                }`}>
                  {product.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Registered</span>
                <span className="text-sm">{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Scans</span>
                <span className="text-sm font-mono">{scanCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cryptographic Certificate */}
        {certificate && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6 animate-fade-in stagger-3" style={{ opacity: 0 }}>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Cryptographic Certificate</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Signature</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  certificate.signatureValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {certificate.signatureValid ? "Valid" : "Invalid"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chain Integrity</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  certificate.chainIntegrity ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {certificate.chainIntegrity ? "Intact" : "Broken"}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Hash</span>
                <p className="text-xs font-mono text-muted-foreground mt-1 break-all bg-secondary/50 p-2 rounded">
                  {certificate.hash}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Provenance Chain */}
        {events && events.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 animate-fade-in stagger-4" style={{ opacity: 0 }}>
            <button
              onClick={() => setShowChain(!showChain)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-sm font-medium text-muted-foreground">
                Provenance Chain ({events.length} events)
              </h2>
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${showChain ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showChain && (
              <div className="mt-4 space-y-4">
                {events.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {EVENT_ICONS[event.type] || "?"}
                      </div>
                      {i < events.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="text-sm font-medium capitalize">{event.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {event.actor} {event.location && `- ${event.location}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/50 mt-1 truncate max-w-xs">
                        {event.hash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
