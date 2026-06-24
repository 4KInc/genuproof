"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
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
  claim?: {
    claimed: boolean;
    claimedAt?: string;
    claimedBy?: string;
    isClaimant: boolean;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ consumerName: "", orderNumber: "", notes: "" });
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1100),
    ];

    async function verify() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}`);
        const data = await res.json();
        setTimeout(() => {
          setResult(data);
          setStage(4);
          setLoading(false);
        }, 1500);
      } catch {
        setTimeout(() => {
          setResult({ authentic: false, scanCount: 0, error: "Service unavailable" });
          setLoading(false);
        }, 1500);
      }
    }
    verify();
    return () => timers.forEach(clearTimeout);
  }, [code]);

  if (loading) {
    const stages = [
      "Validating certificate format",
      "Checking HMAC-SHA256 signature",
      "Verifying hash chain integrity",
      "Querying product database",
    ];

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-xs w-full">
          <div className="mb-8">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Verifying
            </div>
            <div className="font-mono text-[12px] text-muted-foreground/60 break-all">
              {code}
            </div>
          </div>

          <div className="space-y-0 border-t border-border">
            {stages.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-2.5 border-b border-border transition-all duration-500 ${
                  i <= stage ? "opacity-100" : "opacity-20"
                }`}
              >
                <div className="w-4 flex justify-center shrink-0">
                  {i < stage ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : i === stage ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-border" />
                  )}
                </div>
                <span className="text-[12px] text-muted-foreground">{s}</span>
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
          <p className="text-center text-[13px] text-muted-foreground mt-6">
            {result?.error || "This verification code is not recognized."}
          </p>
          <div className="text-center mt-4">
            <Link href="/" className="text-[12px] text-primary hover:underline">
              Return to GenuProof
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { authentic, product, events, warnings, scanCount, certificate } = result;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <SiteNav />

      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-10">
        {/* Certificate */}
        {product && (
          <div className="animate-reveal mb-8">
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
          <div className="border border-warning/30 bg-warning/5 p-4 mb-6 animate-reveal delay-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-warning">
                Security Warning
              </span>
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-[12px] text-muted-foreground ml-3.5 mt-1">{w}</p>
            ))}
          </div>
        )}

        {/* Claim Status / Claim Button */}
        {product && authentic && (
          <div className="mb-6 animate-reveal delay-2">
            {result.claim?.claimed ? (
              <div>
                {result.claim.isClaimant ? (
                  <div className="border border-primary/20 bg-primary/3 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[11px] font-medium tracking-wide uppercase text-primary">Your Product</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground ml-3.5">
                      You registered this product on {new Date(result.claim.claimedAt!).toLocaleDateString()}. This is your verified purchase.
                    </p>
                  </div>
                ) : disputeSubmitted ? (
                  <div className="border border-primary/20 bg-primary/3 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[11px] font-medium tracking-wide uppercase text-primary">Dispute Submitted</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground ml-3.5">
                      The brand has been notified and will investigate. If you are the legitimate buyer, ownership will be transferred to you.
                    </p>
                  </div>
                ) : (
                  <div className="border border-amber-300/30 bg-amber-50/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-medium tracking-wide uppercase text-amber-700">Previously Registered</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground ml-3.5 mb-3">
                      This product was registered to another device on {new Date(result.claim.claimedAt!).toLocaleDateString()}.
                      This could mean the product tag was cloned, or the product changed hands. If you are the rightful owner, you can file a dispute.
                    </p>

                    {!showDispute ? (
                      <div className="ml-3.5 flex items-center gap-2">
                        <button
                          onClick={() => setShowDispute(true)}
                          className="text-[11px] px-4 py-2 bg-amber-600 text-white font-medium tracking-wide hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          I purchased this product
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          File a dispute for brand investigation
                        </span>
                      </div>
                    ) : (
                      <div className="ml-3.5 space-y-3 border-t border-amber-200/50 pt-3">
                        <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
                          Dispute Form
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Your Name</label>
                          <input
                            type="text"
                            value={disputeForm.consumerName}
                            onChange={(e) => setDisputeForm({ ...disputeForm, consumerName: e.target.value })}
                            placeholder="e.g. Jane Smith"
                            className="w-full px-3 py-2 text-[12px] bg-white border border-border focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Order / Receipt Number</label>
                          <input
                            type="text"
                            value={disputeForm.orderNumber}
                            onChange={(e) => setDisputeForm({ ...disputeForm, orderNumber: e.target.value })}
                            placeholder="e.g. ORD-2026-12345"
                            className="w-full px-3 py-2 text-[12px] bg-white border border-border focus:outline-none focus:border-primary/50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Additional Details</label>
                          <textarea
                            value={disputeForm.notes}
                            onChange={(e) => setDisputeForm({ ...disputeForm, notes: e.target.value })}
                            placeholder="Where and when did you purchase this product?"
                            rows={2}
                            className="w-full px-3 py-2 text-[12px] bg-white border border-border focus:outline-none focus:border-primary/50 resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              setDisputeLoading(true);
                              try {
                                const res = await fetch("/api/products/dispute", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ productId: product.productId, ...disputeForm }),
                                });
                                if (res.ok) setDisputeSubmitted(true);
                              } catch { /* silent */ }
                              finally { setDisputeLoading(false); }
                            }}
                            disabled={disputeLoading || !disputeForm.consumerName}
                            className="text-[11px] px-4 py-2 bg-amber-600 text-white font-medium tracking-wide hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {disputeLoading ? "Submitting..." : "Submit Dispute"}
                          </button>
                          <button
                            onClick={() => setShowDispute(false)}
                            className="text-[11px] px-3 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : claimDone ? (
              <div className="border border-primary/20 bg-primary/3 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-medium tracking-wide uppercase text-primary">Product Claimed</span>
                </div>
                <p className="text-[12px] text-muted-foreground ml-3.5 mt-1">
                  This product is now registered to you. Future scans from other devices will show a warning.
                </p>
              </div>
            ) : (
              <div className="border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium mb-0.5">Register this purchase</div>
                    <p className="text-[11px] text-muted-foreground">
                      Claim this product to protect against cloned tags. Future scans from other devices will be flagged.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setClaiming(true);
                      try {
                        const res = await fetch("/api/products/claim", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ productId: product.productId }),
                        });
                        if (res.ok) setClaimDone(true);
                      } catch { /* silent */ }
                      finally { setClaiming(false); }
                    }}
                    disabled={claiming}
                    className="shrink-0 text-[11px] px-4 py-2 bg-primary text-primary-foreground font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {claiming ? "Claiming..." : "Claim Product"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details grid */}
        {product && (
          <div className="grid md:grid-cols-2 gap-px bg-border mb-8 animate-reveal delay-2">
            {/* Product details */}
            <div className="bg-background p-6">
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                Product Details
              </div>
              <div className="space-y-3">
                {[
                  { label: "Product", value: product.name },
                  { label: "Brand", value: product.brandName },
                  ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
                  ...(product.category ? [{ label: "Category", value: product.category }] : []),
                  { label: "Registered", value: new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                  { label: "Total Scans", value: String(scanCount) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-baseline">
                    <span className="text-[11px] text-muted-foreground">{row.label}</span>
                    <span className="text-[13px]">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <span className={`text-[10px] font-medium tracking-wide uppercase ${
                    product.status === "active" ? "text-primary" : "text-destructive"
                  }`}>
                    {product.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate checks */}
            {certificate && (
              <div className="bg-background p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Cryptographic Verification
                </div>
                <div className="space-y-3">
                  {[
                    { label: "HMAC-SHA256 Signature", valid: certificate.signatureValid },
                    { label: "Hash Chain Integrity", valid: certificate.chainIntegrity },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground">{check.label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${check.valid ? "bg-primary" : "bg-destructive"}`} />
                        <span className={`text-[10px] font-medium tracking-wide uppercase ${
                          check.valid ? "text-primary" : "text-destructive"
                        }`}>
                          {check.valid ? "Pass" : "Fail"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border my-4" />

                <div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">
                    SHA-256 Fingerprint
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground/60 break-all leading-relaxed bg-secondary/50 border border-border px-2.5 py-2">
                    {certificate.hash}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Provenance Chain */}
        {events && events.length > 0 && (
          <div className="animate-reveal delay-3">
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

        {/* Actions bar */}
        {product && (
          <div className="mt-8 flex items-center gap-2 animate-reveal delay-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Verification URL copied to clipboard");
              }}
              className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors cursor-pointer"
            >
              Share result
            </button>
            <a
              href={`/api/products/certificate?code=${code}`}
              target="_blank"
              className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
            >
              Export JSON
            </a>
            <Link
              href={`/qr/${code}`}
              className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
            >
              QR Certificate
            </Link>
            <Link
              href={`/product/${product.productId}`}
              className="text-[10px] px-3 py-1.5 border border-border hover:bg-secondary transition-colors"
            >
              Full details
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Powered by GenuProof
          </Link>
          <Link href="/verify" className="text-[11px] text-primary hover:underline">
            Verify another product
          </Link>
        </div>
      </div>
    </div>
  );
}
