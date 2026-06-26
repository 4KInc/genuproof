"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  type: "event" | "scan" | "alert";
  action: string;
  actor?: string | null;
  productId: string | null;
  location: string | null;
  timestamp: string;
  hash?: string | null;
  result?: string;
  severity?: string;
  details?: string;
}

const ACTION_LABELS: Record<string, string> = {
  manufactured: "Product registered",
  shipped: "Product shipped",
  received: "Product received",
  inspected: "Product inspected",
  sold: "Product sold",
  transferred: "Ownership transferred",
  recalled: "Product recalled",
  verification_scan: "Verification scan",
  geographic_anomaly: "Geographic anomaly",
  burst_scan: "Burst scan detected",
  product_recall: "Product recall alert",
};

const TYPE_INDICATORS: Record<string, { dot: string; bg: string }> = {
  event: { dot: "bg-primary", bg: "" },
  scan: { dot: "bg-accent", bg: "" },
  alert: { dot: "bg-destructive", bg: "bg-destructive/3" },
};

function SkeletonRow() {
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-start gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-muted animate-pulse" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="h-3 w-36 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-muted animate-pulse shrink-0" />
          </div>
          <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ brandId }: { brandId?: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/audit?limit=20`);
        const data = await res.json();
        if (res.ok) setEntries(data.entries);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
    // Poll every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [brandId]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[12px]">No activity yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {entries.map((entry, i) => {
        const ind = TYPE_INDICATORS[entry.type] || TYPE_INDICATORS.event;
        return (
          <div key={i} className={`px-4 py-3.5 border-b border-border last:border-b-0 ${ind.bg}`}>
            <div className="flex items-start gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ind.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px]">
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                    {new Date(entry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {entry.actor && (
                    <span className="text-[10px] text-muted-foreground">{entry.actor}</span>
                  )}
                  {entry.location && (
                    <span className="text-[10px] text-muted-foreground/60">{entry.location}</span>
                  )}
                  {entry.severity && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] tracking-wide uppercase font-medium ${
                      entry.severity === "critical" || entry.severity === "high"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    }`}>
                      {entry.severity}
                    </span>
                  )}
                  {entry.result && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] tracking-wide uppercase font-medium ${
                      entry.result === "authentic"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {entry.result}
                    </span>
                  )}
                </div>
                {entry.details && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{entry.details}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
