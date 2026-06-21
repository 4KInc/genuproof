"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthData {
  status: string;
  timestamp: string;
  services: {
    api: string;
    database: string;
    dbLatency: string;
  };
  version: string;
  endpoints: number;
  pages: number;
}

interface UptimeCheck {
  name: string;
  url: string;
  status: "checking" | "up" | "down";
  latency: number;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [checks, setChecks] = useState<UptimeCheck[]>([
    { name: "Landing Page", url: "/", status: "checking", latency: 0 },
    { name: "Verification API", url: "/api/products/verify?code=test", status: "checking", latency: 0 },
    { name: "Brand API", url: "/api/brands/list", status: "checking", latency: 0 },
    { name: "Analytics API", url: "/api/analytics", status: "checking", latency: 0 },
    { name: "Health Endpoint", url: "/api/health", status: "checking", latency: 0 },
    { name: "QR Generation", url: "/api/products/qr?code=test&format=svg", status: "checking", latency: 0 },
    { name: "OG Image", url: "/api/og", status: "checking", latency: 0 },
    { name: "Explore Page", url: "/explore", status: "checking", latency: 0 },
  ]);

  useEffect(() => {
    // Fetch health
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});

    // Run uptime checks
    checks.forEach((check, i) => {
      const start = performance.now();
      fetch(check.url, { method: "GET" })
        .then((res) => {
          const latency = Math.round(performance.now() - start);
          setChecks((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: res.ok || res.status === 404 ? "up" : "down", latency };
            return next;
          });
        })
        .catch(() => {
          setChecks((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: "down", latency: 0 };
            return next;
          });
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allUp = checks.every((c) => c.status === "up" || c.status === "checking");

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-[800px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide uppercase">Authentik</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">System</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight mb-3">
          Platform <em className="text-accent">status.</em>
        </h1>

        {/* Overall status */}
        <div className={`border p-5 mb-8 flex items-center gap-3 ${allUp ? "border-primary/20 bg-primary/3" : "border-destructive/20 bg-destructive/3"}`}>
          <div className={`w-3 h-3 rounded-full ${allUp ? "bg-primary" : "bg-destructive"}`} />
          <span className={`text-[14px] font-medium ${allUp ? "text-primary" : "text-destructive"}`}>
            {allUp ? "All Systems Operational" : "Some Systems Degraded"}
          </span>
          <span className="text-[11px] text-muted-foreground ml-auto">
            {new Date().toLocaleString()}
          </span>
        </div>

        {/* Service checks */}
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Service Checks
        </div>
        <div className="border-t border-border mb-8">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  check.status === "checking" ? "bg-muted-foreground animate-pulse"
                    : check.status === "up" ? "bg-primary"
                    : "bg-destructive"
                }`} />
                <span className="text-[13px]">{check.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {check.latency > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground/50">{check.latency}ms</span>
                )}
                <span className={`text-[10px] font-medium tracking-wide uppercase ${
                  check.status === "checking" ? "text-muted-foreground"
                    : check.status === "up" ? "text-primary"
                    : "text-destructive"
                }`}>
                  {check.status === "checking" ? "Checking" : check.status === "up" ? "Operational" : "Down"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Infrastructure */}
        {health && (
          <>
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Infrastructure
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
              {[
                { label: "API", value: health.services.api, ok: health.services.api === "healthy" },
                { label: "Database", value: health.services.database, ok: health.services.database === "healthy" },
                { label: "DB Latency", value: health.services.dbLatency, ok: true },
                { label: "Version", value: health.version, ok: true },
              ].map((s) => (
                <div key={s.label} className="bg-background p-4">
                  <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">{s.label}</div>
                  <div className={`text-[13px] font-medium ${s.ok ? "text-primary" : "text-destructive"}`}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-px bg-border">
              <div className="bg-background p-4">
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">API Endpoints</div>
                <div className="font-[family-name:var(--font-display)] text-2xl">{health.endpoints}</div>
              </div>
              <div className="bg-background p-4">
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">Pages</div>
                <div className="font-[family-name:var(--font-display)] text-2xl">{health.pages}</div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Back to Authentik
          </Link>
        </div>
      </div>
    </div>
  );
}
