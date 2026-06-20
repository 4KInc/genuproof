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

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-zinc-500",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/20 text-red-400",
  high: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  low: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
};

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
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Scans",
            value: totalScans.toLocaleString(),
            trend: "+12%",
            color: "text-primary",
          },
          {
            label: "Products Protected",
            value: totalProducts.toLocaleString(),
            trend: null,
            color: "text-emerald-400",
          },
          {
            label: "Threat Alerts",
            value: threats.length.toString(),
            trend: threats.length > 0 ? "Active" : null,
            color: threats.length > 0 ? "text-amber-400" : "text-emerald-400",
          },
          {
            label: "Authenticity Rate",
            value: `${authenticity}%`,
            trend: null,
            color: authenticity > 95 ? "text-emerald-400" : "text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className="text-xs text-muted-foreground mb-1">
              {stat.label}
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            {stat.trend && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {stat.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Two columns: scan locations + threats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Scan locations */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
            Scan Locations
          </h3>
          {scans.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No scans recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map((scan, i) => {
                const maxCount = Math.max(...scans.map((s) => s.count));
                const width = Math.max((scan.count / maxCount) * 100, 8);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-muted-foreground truncate">
                      {scan.city}, {scan.country}
                    </div>
                    <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-[10px] font-mono text-white/80">
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
              />
            </svg>
            Threat Feed
          </h3>
          {threats.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">All clear. No threats detected.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {threats.map((threat, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${SEVERITY_BG[threat.severity]}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${SEVERITY_COLORS[threat.severity]}`}
                    />
                    <span className="text-xs font-medium uppercase">
                      {threat.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(threat.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {threat.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
