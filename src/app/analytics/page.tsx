"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Analytics {
  totalScans: number;
  totalProducts: number;
  dailyScans: Array<{ date: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  resultBreakdown: Record<string, number>;
  hourlyDistribution: number[];
  categoryBreakdown: Array<{ category: string; count: number }>;
  statusBreakdown: Record<string, number>;
}

function Bar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="flex-1 h-full bg-secondary flex items-end">
      <div className={`w-full ${color} transition-all duration-700`} style={{ height: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics");
        const d = await res.json();
        if (res.ok) setData(d);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm font-medium tracking-wide uppercase">Authentik</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              <Link href="/explore" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Explore</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Platform</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight mb-10">
          Analytics <em className="text-accent">overview.</em>
        </h1>

        {loading ? (
          <div className="text-[12px] text-muted-foreground py-16 text-center">Loading analytics...</div>
        ) : !data ? (
          <div className="text-[12px] text-muted-foreground py-16 text-center">Failed to load analytics.</div>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-10">
              {[
                { label: "Total Products", value: data.totalProducts },
                { label: "Total Scans", value: data.totalScans },
                { label: "Countries", value: data.topCountries.length },
                { label: "Categories", value: data.categoryBreakdown.length },
              ].map((s) => (
                <div key={s.label} className="bg-background p-6">
                  <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">{s.label}</div>
                  <div className="font-[family-name:var(--font-display)] text-3xl">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              {/* Daily scans chart */}
              <div className="border border-border bg-card p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Scans — Last 7 Days
                </div>
                <div className="flex items-end gap-1 h-32">
                  {data.dailyScans.map((d) => {
                    const max = Math.max(...data.dailyScans.map((x) => x.count), 1);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end h-24">
                          <Bar value={d.count} max={max} />
                        </div>
                        <span className="text-[8px] text-muted-foreground/50 tabular-nums">
                          {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly distribution */}
              <div className="border border-border bg-card p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Scans by Hour of Day
                </div>
                <div className="flex items-end gap-px h-32">
                  {data.hourlyDistribution.map((count, hour) => {
                    const max = Math.max(...data.hourlyDistribution, 1);
                    return (
                      <div key={hour} className="flex-1 flex items-end h-24" title={`${hour}:00 — ${count} scans`}>
                        <Bar value={count} max={max} color="bg-accent/60" />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-muted-foreground/40">00:00</span>
                  <span className="text-[8px] text-muted-foreground/40">12:00</span>
                  <span className="text-[8px] text-muted-foreground/40">23:00</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Top countries */}
              <div className="border border-border bg-card p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Top Countries
                </div>
                {data.topCountries.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/50 py-4">No data</div>
                ) : (
                  <div className="space-y-2.5">
                    {data.topCountries.map((c) => {
                      const max = data.topCountries[0].count;
                      const pct = Math.max((c.count / max) * 100, 6);
                      return (
                        <div key={c.country} className="flex items-center gap-3">
                          <span className="w-16 text-[11px] text-muted-foreground truncate">{c.country}</span>
                          <div className="flex-1 h-3 bg-secondary">
                            <div className="h-full bg-primary/20 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              <div className="border border-border bg-card p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Products by Category
                </div>
                <div className="space-y-2.5">
                  {data.categoryBreakdown.map((c) => {
                    const max = data.categoryBreakdown[0].count;
                    const pct = Math.max((c.count / max) * 100, 6);
                    return (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="w-20 text-[11px] text-muted-foreground truncate">{c.category}</span>
                        <div className="flex-1 h-3 bg-secondary">
                          <div className="h-full bg-accent/30 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="border border-border bg-card p-6">
                <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Product Status
                </div>
                <div className="space-y-4">
                  {Object.entries(data.statusBreakdown).map(([status, count]) => {
                    const total = data.totalProducts || 1;
                    const pct = Math.round((count / total) * 100);
                    const color = status === "active" ? "text-primary" : status === "recalled" ? "text-destructive" : "text-accent";
                    return (
                      <div key={status}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className={`text-[11px] font-medium uppercase tracking-wide ${color}`}>{status}</span>
                          <span className="text-[12px] font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-secondary">
                          <div className={`h-full transition-all ${status === "active" ? "bg-primary/30" : status === "recalled" ? "bg-destructive/30" : "bg-accent/30"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Verification result breakdown */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-3">
                    Scan Results
                  </div>
                  {Object.entries(data.resultBreakdown).map(([result, count]) => (
                    <div key={result} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${result === "authentic" ? "bg-primary" : "bg-destructive"}`} />
                        <span className="text-[11px] text-muted-foreground">{result}</span>
                      </div>
                      <span className="text-[11px] font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
