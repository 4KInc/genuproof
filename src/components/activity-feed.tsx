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
    return <div className="text-[12px] text-muted-foreground py-4">Loading activity...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-[12px] text-muted-foreground py-4">No activity yet.</div>;
  }

  return (
    <div className="border-t border-border">
      {entries.map((entry, i) => {
        const ind = TYPE_INDICATORS[entry.type] || TYPE_INDICATORS.event;
        return (
          <div key={i} className={`py-3 border-b border-border ${ind.bg}`}>
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
                    <span className={`text-[9px] tracking-wide uppercase font-medium ${
                      entry.severity === "critical" || entry.severity === "high"
                        ? "text-destructive"
                        : "text-warning"
                    }`}>
                      {entry.severity}
                    </span>
                  )}
                  {entry.result && (
                    <span className={`text-[9px] tracking-wide uppercase font-medium ${
                      entry.result === "authentic" ? "text-primary" : "text-destructive"
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
