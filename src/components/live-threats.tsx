"use client";

import { useEffect, useState, useRef } from "react";

interface LiveThreat {
  type: string;
  severity: string;
  productId?: string;
  details: string;
  timestamp: string;
  source: string;
}

const SEVERITY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  critical: { dot: "bg-destructive", bg: "bg-destructive/5 border-destructive/20", text: "text-destructive" },
  high: { dot: "bg-destructive/70", bg: "bg-destructive/5 border-destructive/10", text: "text-destructive" },
  medium: { dot: "bg-warning", bg: "bg-warning/5 border-warning/20", text: "text-warning" },
  low: { dot: "bg-muted-foreground", bg: "bg-muted/40 border-border", text: "text-muted-foreground" },
};

const TYPE_LABELS: Record<string, string> = {
  geographic_anomaly: "Geographic Anomaly",
  burst_scan: "Burst Scan Detected",
  hash_tampering: "Hash Tampering",
  product_recall: "Product Recall",
  duplicate_scan: "Duplicate Scan",
};

export function LiveThreats({ brandId }: { brandId: string }) {
  const [threats, setThreats] = useState<LiveThreat[]>([]);
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const es = new EventSource(`/api/stream?brandId=${brandId}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.addEventListener("threat", (event) => {
      const threat: LiveThreat = JSON.parse(event.data);
      setThreats((prev) => [threat, ...prev].slice(0, 20));
      // Flash animation
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    });

    es.addEventListener("heartbeat", () => {
      // Keep-alive, no action needed
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [brandId]);

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              connected ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
            }`}
          />
          <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">
            Live Threat Feed
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/50 tabular-nums">
          {connected ? "Connected via SSE" : "Connecting..."}
        </span>
      </div>

      {/* Threat list */}
      <div className={`transition-colors duration-500 ${flash ? "bg-destructive/5" : ""}`}>
        {threats.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="flex justify-center mb-3">
              <svg className="w-8 h-8 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[12px] text-primary font-medium">Monitoring</span>
            </div>
            <p className="text-[11px] text-muted-foreground/50 max-w-[220px] mx-auto leading-relaxed">
              Watching for threats via DynamoDB Streams. Alerts appear here in real time.
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {threats.map((threat, i) => {
              const colors = SEVERITY_COLORS[threat.severity] || SEVERITY_COLORS.low;
              return (
                <div
                  key={`${threat.timestamp}-${i}`}
                  className={`px-4 py-3 border-b border-border last:border-b-0 ${
                    i === 0 && flash ? "animate-reveal" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className={`text-[9px] tracking-wide uppercase font-semibold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} border`}>
                      {threat.severity}
                    </span>
                    <span className="text-[11px] font-medium truncate">
                      {TYPE_LABELS[threat.type] || threat.type}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 ml-auto tabular-nums flex-shrink-0">
                      {new Date(threat.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-4 leading-relaxed">{threat.details}</p>
                  {threat.source === "lambda-stream" && (
                    <div className="flex items-center gap-1 mt-1.5 ml-4">
                      <div className="w-1 h-1 rounded-full bg-accent/50" />
                      <span className="text-[8px] text-accent/60">via DynamoDB Streams</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
