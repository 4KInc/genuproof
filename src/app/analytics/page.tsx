"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

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
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex-1 h-full bg-secondary/50 rounded-t flex items-end">
      <div className={`w-full ${color} rounded-t transition-all duration-700`} style={{ height: `${pct}%` }} />
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="skeleton h-3 w-20 mb-2" />
      <div className="skeleton h-8 w-14" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="border border-border bg-card rounded-lg p-6">
      <div className="skeleton h-3 w-32 mb-6" />
      <div className="flex items-end gap-2 h-24">
        {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
          <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
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
      <SiteNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
        <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">Platform</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight mb-10">
          Analytics <em className="text-accent">overview.</em>
        </h1>

        {loading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : !data ? (
          <div className="border border-dashed border-border rounded-lg py-16 text-center">
            <svg className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <p className="text-[14px] text-muted-foreground mb-1">Failed to load analytics</p>
            <p className="text-[12px] text-muted-foreground/50">Please try refreshing the page.</p>
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[
                { label: "Total Products", value: data.totalProducts, icon: (
                  <svg className="w-4 h-4 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                )},
                { label: "Total Scans", value: data.totalScans, icon: (
                  <svg className="w-4 h-4 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
                  </svg>
                )},
                { label: "Countries", value: data.topCountries.length, icon: (
                  <svg className="w-4 h-4 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                )},
                { label: "Categories", value: data.categoryBreakdown.length, icon: (
                  <svg className="w-4 h-4 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                )},
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{s.label}</div>
                    {s.icon}
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-3xl">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Daily scans chart */}
              <div className="border border-border bg-card rounded-lg p-6">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
                  Scans — Last 7 Days
                </div>
                <div className="flex items-end gap-1.5 h-32">
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
              <div className="border border-border bg-card rounded-lg p-6">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
                  Scans by Hour of Day
                </div>
                <div className="flex items-end gap-px h-32">
                  {data.hourlyDistribution.map((count, hour) => {
                    const max = Math.max(...data.hourlyDistribution, 1);
                    return (
                      <div key={hour} className="flex-1 flex items-end h-24 group relative" title={`${hour}:00 — ${count} scans`}>
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

            <div className="grid md:grid-cols-3 gap-6">
              {/* Top countries */}
              <div className="border border-border bg-card rounded-lg p-6">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
                  Top Countries
                </div>
                {data.topCountries.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/50 py-4 text-center">No data yet</div>
                ) : (
                  <div className="space-y-2.5">
                    {data.topCountries.map((c) => {
                      const max = data.topCountries[0].count;
                      const pct = Math.max((c.count / max) * 100, 6);
                      return (
                        <div key={c.country} className="flex items-center gap-3">
                          <span className="w-16 text-[11px] text-muted-foreground truncate">{c.country}</span>
                          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary/20 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              <div className="border border-border bg-card rounded-lg p-6">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
                  Products by Category
                </div>
                <div className="space-y-2.5">
                  {data.categoryBreakdown.map((c) => {
                    const max = data.categoryBreakdown[0].count;
                    const pct = Math.max((c.count / max) * 100, 6);
                    return (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="w-20 text-[11px] text-muted-foreground truncate">{c.category}</span>
                        <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-accent/30 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="border border-border bg-card rounded-lg p-6">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-4 font-medium">
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
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${status === "active" ? "bg-primary/30" : status === "recalled" ? "bg-destructive/30" : "bg-accent/30"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-3 font-medium">
                    Scan Results
                  </div>
                  {Object.entries(data.resultBreakdown).map(([result, count]) => (
                    <div key={result} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${result === "authentic" ? "bg-primary" : "bg-destructive"}`} />
                        <span className="text-[11px] text-muted-foreground capitalize">{result}</span>
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
