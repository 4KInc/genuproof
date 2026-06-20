"use client";

import { useState } from "react";

interface ProvenanceEvent {
  type: string;
  actor: string;
  location?: string;
  timestamp: string;
  hash: string;
  previousHash: string;
  data?: Record<string, unknown>;
}

const EVENT_LABELS: Record<string, string> = {
  manufactured: "Manufactured",
  shipped: "Shipped",
  received: "Received",
  inspected: "Inspected",
  sold: "Sold",
  transferred: "Transferred",
  recalled: "Recalled",
  custom: "Event",
};

export function ProvenanceTimeline({ events }: { events: ProvenanceEvent[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-[13px]">
        No provenance events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event, idx) => {
        const isExpanded = expandedIdx === idx;
        const chainValid = idx === 0 || event.previousHash === events[idx - 1]?.hash;

        return (
          <div
            key={idx}
            className="animate-reveal"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full text-left group"
            >
              <div className="flex items-start gap-4 py-4 border-b border-border group-hover:bg-secondary/20 transition-colors px-1 -mx-1">
                {/* Index + chain indicator */}
                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${chainValid ? "bg-primary" : "bg-destructive"}`} />
                  {idx < events.length - 1 && (
                    <div className="w-px h-4 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium">
                        {EVENT_LABELS[event.type] || event.type}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {event.actor}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(event.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {event.location && (
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {event.location}
                    </div>
                  )}
                </div>

                {/* Expand indicator */}
                <svg
                  className={`w-3 h-3 text-muted-foreground/40 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="ml-6 py-3 px-4 border-b border-border bg-secondary/20">
                <div className="grid gap-2.5">
                  <div>
                    <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">
                      Event Hash
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">
                      {event.hash}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">
                      Previous Hash
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">
                      {event.previousHash || "Genesis block"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${chainValid ? "bg-primary" : "bg-destructive"}`} />
                    <span className={`text-[10px] ${chainValid ? "text-primary" : "text-destructive"}`}>
                      {chainValid ? "Chain link intact" : "Chain link broken"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
