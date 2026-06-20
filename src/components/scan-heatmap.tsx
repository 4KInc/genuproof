"use client";

interface ScanData {
  country: string;
  city: string;
  count: number;
  lastScan: string;
}

interface ThreatData {
  type: string;
  severity: string;
  details: string;
  timestamp: string;
}

export function ScanAnalytics({
  scans,
  threats,
  totalScans,
  totalProducts,
}: {
  scans: ScanData[];
  threats: ThreatData[];
  totalScans: number;
  totalProducts: number;
}) {
  const authenticity = totalScans > 0 ? Math.round(((totalScans - threats.length) / totalScans) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {[
          { label: "Total Scans", value: totalScans.toLocaleString() },
          { label: "Products", value: totalProducts.toLocaleString() },
          { label: "Alerts", value: threats.length.toString() },
          { label: "Authenticity", value: `${authenticity}%` },
        ].map((stat) => (
          <div key={stat.label} className="bg-background p-5">
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
              {stat.label}
            </div>
            <div className="font-[family-name:var(--font-display)] text-2xl">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scan locations */}
        <div className="border border-border bg-card p-5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Scan Locations
          </div>
          {scans.length === 0 ? (
            <div className="text-[12px] text-muted-foreground/50 py-6 text-center">
              No scans recorded yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {scans.map((scan, i) => {
                const maxCount = Math.max(...scans.map((s) => s.count));
                const pct = Math.max((scan.count / maxCount) * 100, 6);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 text-[11px] text-muted-foreground truncate">
                      {scan.city}, {scan.country}
                    </div>
                    <div className="flex-1 h-4 bg-secondary">
                      <div
                        className="h-full bg-primary/15 flex items-center justify-end pr-2 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-[9px] font-mono text-primary/60">
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

        {/* Threat feed */}
        <div className="border border-border bg-card p-5">
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
            <div className="space-y-0 border-t border-border">
              {threats.map((threat, i) => {
                const sevColor = threat.severity === "critical" || threat.severity === "high"
                  ? "bg-destructive" : threat.severity === "medium" ? "bg-warning" : "bg-muted-foreground";
                return (
                  <div key={i} className="py-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sevColor}`} />
                      <span className="text-[10px] tracking-wide uppercase text-muted-foreground">
                        {threat.severity}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground ml-3.5">{threat.details}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
