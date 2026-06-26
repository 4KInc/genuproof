"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/brands",
    desc: "Register a new brand",
    body: '{ "name": "Luxe Watches", "domain": "luxe.com", "industry": "fashion" }',
    response: '{ "id": "uuid", "name": "...", "plan": "free" }',
  },
  {
    method: "POST",
    path: "/api/products/register",
    desc: "Register a single product with cryptographic certificate",
    body: '{ "brandId": "uuid", "name": "Chronograph 42mm", "sku": "LW-01", "category": "Watches", "manufacturingLocation": "Geneva" }',
    response: '{ "productId": "hex", "verificationCode": "abc123", "hash": "sha256...", "signature": "hmac..." }',
  },
  {
    method: "POST",
    path: "/api/products/batch",
    desc: "Register up to 50 products in one request",
    body: '{ "brandId": "uuid", "products": [{ "name": "...", "sku": "..." }, ...] }',
    response: '{ "registered": 50, "products": [...] }',
  },
  {
    method: "GET",
    path: "/api/products/verify?code=abc123",
    desc: "Verify a product by code. Records scan, runs anomaly detection.",
    body: null,
    response: '{ "authentic": true, "product": {...}, "events": [...], "certificate": { "signatureValid": true, "chainIntegrity": true } }',
  },
  {
    method: "POST",
    path: "/api/products/events",
    desc: "Add a hash-chained provenance event",
    body: '{ "productId": "hex", "type": "shipped", "actor": "FedEx", "location": "NYC" }',
    response: '{ "hash": "sha256...", "previousHash": "sha256...", "timestamp": "..." }',
  },
  {
    method: "POST",
    path: "/api/products/transfer",
    desc: "Transfer product ownership. Creates transfer event, updates status.",
    body: '{ "productId": "hex", "newOwner": "New Owner LLC", "location": "Miami, FL" }',
    response: '{ "success": true, "hash": "sha256...", "newOwner": "..." }',
  },
  {
    method: "GET",
    path: "/api/threats?brandId=uuid",
    desc: "Fetch threat alerts for a brand",
    body: null,
    response: '{ "threats": [{ "type": "geographic_anomaly", "severity": "high", "details": "..." }] }',
  },
  {
    method: "GET",
    path: "/api/products/list?brandId=uuid",
    desc: "List all products for a brand (via GSI1)",
    body: null,
    response: '{ "products": [...], "count": 42 }',
  },
  {
    method: "GET",
    path: "/api/products/qr?code=abc123",
    desc: "Generate QR code (PNG or SVG) for a verification code",
    body: null,
    response: "Binary PNG or SVG image",
  },
  {
    method: "POST",
    path: "/api/products/recall",
    desc: "Recall a product. Creates recall event, updates status to recalled, generates critical threat alert.",
    body: '{ "productId": "hex", "reason": "Safety defect in batch #42", "issuedBy": "Quality Assurance" }',
    response: '{ "success": true, "hash": "sha256...", "status": "recalled" }',
  },
  {
    method: "GET",
    path: "/api/products/search?code=abc123",
    desc: "Search products by verification code, product ID, or brand ID",
    body: null,
    response: '{ "found": true, "product": { "productId": "...", "name": "...", "status": "active" } }',
  },
  {
    method: "GET",
    path: "/api/products/certificate?code=abc123",
    desc: "Export full cryptographic certificate as JSON (product + crypto verification + provenance chain)",
    body: null,
    response: '{ "version": "1.0", "product": {...}, "cryptography": {...}, "provenance": {...}, "verification": {...} }',
  },
  {
    method: "GET",
    path: "/api/brands/list",
    desc: "List all registered brands",
    body: null,
    response: '{ "brands": [{ "id": "...", "name": "...", "domain": "..." }], "count": 3 }',
  },
  {
    method: "GET",
    path: "/api/brands/stats?brandId=uuid",
    desc: "Real-time brand statistics (products, scans, threats, status breakdown)",
    body: null,
    response: '{ "productCount": 42, "activeProducts": 40, "totalScans": 1250, "unresolvedThreats": 2 }',
  },
  {
    method: "GET",
    path: "/api/audit?limit=30",
    desc: "Platform-wide audit log — events, scans, and alerts sorted by time",
    body: null,
    response: '{ "entries": [{ "type": "event", "action": "shipped", "actor": "FedEx", "timestamp": "..." }] }',
  },
  {
    method: "GET",
    path: "/api/explore?limit=50",
    desc: "Public product gallery — all verified products for consumer browsing",
    body: null,
    response: '{ "products": [...], "count": 50 }',
  },
  {
    method: "GET",
    path: "/api/health",
    desc: "Platform health check — API status, database connectivity, latency",
    body: null,
    response: '{ "status": "operational", "services": { "api": "healthy", "database": "healthy", "dbLatency": "8ms" } }',
  },
  {
    method: "GET",
    path: "/api/og?brand=X&product=Y",
    desc: "Dynamic Open Graph image generation for social sharing",
    body: null,
    response: "1200x630 PNG image",
  },
];

function ClipboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

export default function DocsPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="max-w-[960px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4">
          Documentation
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-[1.05] tracking-tight mb-3">
          API <em className="text-accent">Reference</em>
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-10 max-w-lg">
          RESTful API for product registration, verification, provenance tracking,
          and threat intelligence. All responses are JSON. Base URL:{" "}
          <code className="font-mono text-[12px] bg-secondary px-1.5 py-0.5 border border-border rounded-md">
            https://genuproof.com
          </code>
        </p>

        <div className="grid md:grid-cols-[200px,1fr] gap-8">
          {/* Sticky sidebar */}
          <aside className="hidden md:block">
            <nav className="sticky top-8 space-y-1">
              <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-3">
                On this page
              </p>
              <a
                href="#endpoints"
                className="block text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Endpoints
              </a>
              <a
                href="#cryptographic-design"
                className="block text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Cryptographic Design
              </a>
            </nav>
          </aside>

          {/* Main content */}
          <div>
            <div id="endpoints" className="space-y-3">
              {ENDPOINTS.map((ep, idx) => (
                <div
                  key={ep.path + ep.method}
                  className="rounded-lg border border-border p-5 hover:border-primary/10 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-[10px] font-mono font-medium tracking-wide px-2 py-0.5 rounded-md ${
                        ep.method === "GET"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <code className="font-mono text-[13px] text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-3">{ep.desc}</p>

                  {ep.body && (
                    <div className="mb-2">
                      <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                        Request Body
                      </div>
                      <pre className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-md p-3 overflow-x-auto">
                        {ep.body}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                      Response
                    </div>
                    <div className="relative">
                      <pre className="font-mono text-[11px] text-muted-foreground bg-secondary border border-border rounded-md p-3 overflow-x-auto pr-16">
                        {ep.response}
                      </pre>
                      <button
                        onClick={() => handleCopy(ep.response, idx)}
                        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-secondary border border-border rounded px-1.5 py-1 transition-colors"
                        aria-label="Copy response"
                      >
                        {copiedIdx === idx ? (
                          <span>Copied!</span>
                        ) : (
                          <ClipboardIcon />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div id="cryptographic-design" className="mt-10 pt-6 border-t border-border">
              <h2 className="font-[family-name:var(--font-display)] text-xl mb-3">
                Cryptographic Design
              </h2>
              <div className="space-y-3 text-[13px] text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">Product Hash:</strong> Each product record is canonicalized
                  to JSON and hashed with SHA-256. The hash is then signed with HMAC-SHA256 using a server-side
                  secret. Verification recomputes the hash and checks both the hash match and the HMAC signature.
                </p>
                <p>
                  <strong className="text-foreground">Provenance Chain:</strong> Each supply chain event includes
                  the hash of the previous event. The chain starts with a genesis event whose previousHash is
                  SHA-256 of an empty string. Tampering with any event breaks all subsequent hash links.
                </p>
                <p>
                  <strong className="text-foreground">Anomaly Detection:</strong> Every verification scan records
                  the requester&apos;s IP and geolocation. The system checks for geographic anomalies (same product
                  scanned from 3+ countries in 24 hours) and burst patterns (10+ scans per hour).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
