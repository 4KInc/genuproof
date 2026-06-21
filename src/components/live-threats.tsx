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
  critical: { dot: "bg-red-600", bg: "bg-red-50 border-red-200", text: "text-red-700" },
  high: { dot: "bg-orange-500", bg: "bg-orange-50 border-orange-200", text: "text-orange-700" },
  medium: { dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  low: { dot: "bg-zinc-400", bg: "bg-zinc-50 border-zinc-200", text: "text-zinc-600" },
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
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
            Live Threat Feed
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/50">
          {connected ? "Connected via SSE" : "Connecting..."}
        </span>
      </div>

      {/* Threat list */}
      <div className={`transition-colors duration-500 ${flash ? "bg-red-50/50" : ""}`}>
        {threats.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[12px] text-primary font-medium">Monitoring</span>
            </div>
            <p className="text-[11px] text-muted-foreground/50">
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
                  className={`px-4 py-3 border-b border-border ${i === 0 && flash ? "animate-reveal" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span className={`text-[9px] tracking-wide uppercase font-medium ${colors.text}`}>
                      {threat.severity}
                    </span>
                    <span className="text-[11px] font-medium">
                      {TYPE_LABELS[threat.type] || threat.type}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 ml-auto tabular-nums">
                      {new Date(threat.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-3.5">{threat.details}</p>
                  {threat.source === "lambda-stream" && (
                    <div className="flex items-center gap-1 mt-1 ml-3.5">
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
