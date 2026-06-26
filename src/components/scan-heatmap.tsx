"use client";

import { useEffect, useState } from "react";

interface ScanLocation {
  country: string;
  city: string;
  count: number;
  lastScan: string;
}

interface ThreatHotspot {
  country: string;
  city: string;
  count: number;
}

interface ThreatData {
  type: string;
  severity: string;
  details: string;
  timestamp: string;
  country?: string;
  city?: string;
}

// ── Inline SVG icons (no external dependency) ────────────────────────────────

function IconScan() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4V2.5A1.5 1.5 0 0 1 2.5 1H4M12 1h1.5A1.5 1.5 0 0 1 15 2.5V4M15 12v1.5A1.5 1.5 0 0 1 13.5 15H12M4 15H2.5A1.5 1.5 0 0 1 1 13.5V12" />
      <rect x="5" y="5" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1 L14 4.5 V11.5 L8 15 L2 11.5 V4.5 Z" />
      <path d="M8 1 L8 15" />
      <path d="M2 4.5 L8 8 L14 4.5" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1 L15 14 H1 Z" />
      <path d="M8 6 V9" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5 L14 4 V8 C14 11.5 11 14 8 15 C5 14 2 11.5 2 8 V4 Z" />
      <path d="M5.5 8 L7 9.5 L10.5 6" />
    </svg>
  );
}

// ── Skeleton loading state ────────────────────────────────────────────────────

function BarChartSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {[80, 60, 95, 45, 70].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-3 rounded-full" style={{ width: "6rem" }} />
          <div className="flex-1 h-5 rounded-lg bg-secondary overflow-hidden">
            <div className="skeleton h-full rounded-lg" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScanAnalytics({
  brandId,
  threats,
  totalScans,
  totalProducts,
}: {
  brandId: string;
  threats: ThreatData[];
  totalScans: number;
  totalProducts: number;
}) {
  const [scanLocations, setScanLocations] = useState<ScanLocation[]>([]);
  const [threatHotspots, setThreatHotspots] = useState<ThreatHotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) return;
    async function load() {
      try {
        const res = await fetch(`/api/brands/scans?brandId=${brandId}`);
        const data = await res.json();
        if (res.ok) {
          setScanLocations(data.locations || []);
          setThreatHotspots(data.threatHotspots || []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, [brandId]);

  // Also aggregate threat locations from threat data (for threats that have geo)
  const threatGeoMap = new Map<string, { country: string; city: string; count: number }>();
  for (const t of threats) {
    if (!t.country || t.country === "Unknown") continue;
    if (t.severity !== "high" && t.severity !== "critical") continue;
    const key = `${t.city},${t.country}`;
    const existing = threatGeoMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      threatGeoMap.set(key, { country: t.country, city: t.city || "Unknown", count: 1 });
    }
  }
  const threatLocations = [
    ...threatHotspots,
    ...[...threatGeoMap.values()],
  ];
  // Merge duplicates
  const mergedMap = new Map<string, ThreatHotspot>();
  for (const loc of threatLocations) {
    const key = `${loc.city},${loc.country}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.count += loc.count;
    } else {
      mergedMap.set(key, { ...loc });
    }
  }
  const allHotspots = [...mergedMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const authenticity = totalScans > 0 ? Math.round(((totalScans - threats.length) / totalScans) * 100) : 100;

  // Determine icon color for authenticity stat
  const authenticityIconColor = authenticity >= 90
    ? "text-success"
    : authenticity >= 70
    ? "text-warning"
    : "text-destructive";

  // Severity badge styles — pill shaped, CSS-variable colors only
  function sevBadgeClass(severity: string) {
    if (severity === "critical" || severity === "high") {
      return "bg-destructive/10 text-destructive border border-destructive/20";
    }
    if (severity === "medium") {
      return "bg-warning/10 text-warning border border-warning/20";
    }
    return "bg-muted text-muted-foreground border border-border";
  }

  // Hotspot dot / bar color
  function hotspotColor(count: number) {
    if (count >= 5) return { dot: "bg-destructive", bar: "bg-destructive/20", text: "text-destructive/70" };
    if (count >= 2) return { dot: "bg-warning", bar: "bg-warning/20", text: "text-warning/80" };
    return { dot: "bg-accent", bar: "bg-accent/15", text: "text-accent/70" };
  }

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Scans",
            value: totalScans.toLocaleString(),
            icon: <IconScan />,
            iconClass: "text-primary",
          },
          {
            label: "Products",
            value: totalProducts.toLocaleString(),
            icon: <IconBox />,
            iconClass: "text-accent",
          },
          {
            label: "Alerts",
            value: threats.length.toString(),
            icon: <IconAlert />,
            iconClass: threats.length > 0 ? "text-destructive" : "text-muted-foreground",
          },
          {
            label: "Authenticity",
            value: `${authenticity}%`,
            icon: <IconShield />,
            iconClass: authenticityIconColor,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
          >
            <div className={`${stat.iconClass} opacity-70`}>{stat.icon}</div>
            <div>
              <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
                {stat.label}
              </div>
              <div className="font-[family-name:var(--font-display)] text-2xl">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Scan locations */}
        <div className="border border-border bg-card rounded-lg p-5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Scan Locations
          </div>
          {loading ? (
            <BarChartSkeleton />
          ) : scanLocations.length === 0 ? (
            <div className="text-[12px] text-muted-foreground/50 py-6 text-center">
              No scans recorded yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {scanLocations.map((scan, i) => {
                const maxCount = Math.max(...scanLocations.map((s) => s.count));
                const pct = Math.max((scan.count / maxCount) * 100, 6);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 text-[11px] text-muted-foreground truncate shrink-0">
                      {scan.city}, {scan.country}
                    </div>
                    <div className="flex-1 h-5 bg-secondary rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-primary/20 rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-[9px] font-mono text-primary/70 leading-none">
                          {scan.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Counterfeiting Hotspots */}
        <div className="border border-border bg-card rounded-lg p-5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Counterfeiting Hotspots
          </div>
          {allHotspots.length === 0 ? (
            <div className="py-6 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[12px] text-primary font-medium">All clear</span>
              </div>
              <p className="text-[11px] text-muted-foreground/50">No suspicious activity detected.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allHotspots.map((spot, i) => {
                const maxCount = Math.max(...allHotspots.map((s) => s.count));
                const pct = Math.max((spot.count / maxCount) * 100, 8);
                const { dot, bar, text } = hotspotColor(spot.count);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-28 shrink-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="text-[11px] text-muted-foreground truncate">
                        {spot.city}, {spot.country}
                      </span>
                    </div>
                    <div className="flex-1 h-5 bg-secondary rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${bar} rounded-lg flex items-center justify-end pr-2 transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      >
                        <span className={`text-[9px] font-mono ${text} leading-none`}>
                          {spot.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                {[
                  { dot: "bg-accent", label: "Low" },
                  { dot: "bg-warning", label: "Medium" },
                  { dot: "bg-destructive", label: "High" },
                ].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Threat feed ── */}
      <div className="border border-border bg-card rounded-lg p-5">
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
          Threat Feed
        </div>
        {threats.length === 0 ? (
          <div className="py-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[12px] text-primary font-medium">All clear</span>
            </div>
            <p className="text-[11px] text-muted-foreground/50">No threats detected.</p>
          </div>
        ) : (
          <div className="space-y-0 border-t border-border max-h-[300px] overflow-y-auto">
            {threats.slice(0, 20).map((threat, i) => (
              <div key={i} className="py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {/* Pill badge for severity */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] tracking-wide uppercase font-medium ${sevBadgeClass(threat.severity)}`}
                  >
                    {threat.severity}
                  </span>
                  {threat.country && threat.country !== "Unknown" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] bg-muted text-muted-foreground border border-border">
                      {threat.city}, {threat.country}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                    {new Date(threat.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground pl-0.5 leading-relaxed">
                  {threat.details}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
