"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    period: "",
    products: "10 products",
    description: "Try GenuProof with basic product authentication.",
    features: [
      "10 product registrations",
      "SHA-256 + HMAC verification",
      "QR code generation",
      "Provenance chain (3 events)",
      "Basic verification page",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    id: "brand",
    name: "Brand",
    price: "$99",
    period: "/month",
    products: "500 products",
    description: "Full anti-counterfeiting suite for growing brands.",
    features: [
      "500 product registrations",
      "Unlimited provenance events",
      "AI threat detection (Gemini 2.5)",
      "Real-time SSE dashboard",
      "Anti-tag-cloning protection",
      "Carrier integrations (FedEx, DHL, UPS)",
      "POS integrations (Shopify, Square)",
      "Scan analytics & reports",
      "Consumer claim & dispute flow",
    ],
    cta: "Start Brand Plan",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$299",
    period: "/month",
    products: "Unlimited",
    description: "Enterprise-grade authentication with compliance.",
    features: [
      "Unlimited product registrations",
      "Everything in Brand",
      "EU Digital Product Passport export",
      "API webhooks & notifications",
      "Batch registration (50/request)",
      "Custom WMS integration",
      "Team seats & permissions",
      "Priority support",
      "Embeddable verification widget",
      "White-label QR certificates",
    ],
    cta: "Start Business Plan",
    highlight: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    if (planId === "starter") {
      window.location.href = "/dashboard";
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* silent */ }
    finally { setLoading(null); }
  };

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-16">
        <div className="text-center mb-14">
          <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Pricing</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight mb-3">
            Trust shouldn&apos;t cost <em className="text-accent">$50,000.</em>
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-md mx-auto">
            Institutional-grade cryptographic authentication at self-serve pricing.
            No implementation fees. No enterprise contracts. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-0">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border p-8 ${
                plan.highlight
                  ? "border-primary bg-primary/[0.02] relative"
                  : "border-border"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-px left-0 right-0 h-[3px] bg-primary" />
              )}

              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">
                {plan.name}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-[family-name:var(--font-display)] text-4xl">{plan.price}</span>
                {plan.period && <span className="text-[13px] text-muted-foreground">{plan.period}</span>}
              </div>
              <div className="text-[12px] text-muted-foreground mb-1">{plan.products}</div>
              <p className="text-[12px] text-muted-foreground mb-6">{plan.description}</p>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-2.5 text-[13px] font-medium tracking-wide transition-colors cursor-pointer disabled:opacity-50 mb-6 ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                {loading === plan.id ? "Loading..." : plan.cta}
              </button>

              <div className="space-y-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-[12px] text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[12px] text-muted-foreground">
            All plans include SHA-256 hash chains, HMAC signatures, QR codes, and consumer verification.
            <br />
            Need custom pricing for 10,000+ products? <Link href="/docs" className="text-primary hover:underline">Contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
