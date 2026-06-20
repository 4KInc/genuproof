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

const EVENT_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string; label: string }
> = {
  manufactured: {
    color: "text-violet-400",
    bg: "bg-violet-500/20 border-violet-500/30",
    icon: "M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085",
    label: "Manufactured",
  },
  shipped: {
    color: "text-blue-400",
    bg: "bg-blue-500/20 border-blue-500/30",
    icon: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-2.25h6.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H18.75m-7.5-2.25v-1.5c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v1.5m-7.5 0h7.5",
    label: "Shipped",
  },
  received: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20 border-emerald-500/30",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    label: "Received",
  },
  inspected: {
    color: "text-amber-400",
    bg: "bg-amber-500/20 border-amber-500/30",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    label: "Inspected",
  },
  sold: {
    color: "text-green-400",
    bg: "bg-green-500/20 border-green-500/30",
    icon: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
    label: "Sold",
  },
  transferred: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/20 border-cyan-500/30",
    icon: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    label: "Transferred",
  },
  recalled: {
    color: "text-red-400",
    bg: "bg-red-500/20 border-red-500/30",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z",
    label: "Recalled",
  },
  custom: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/20 border-zinc-500/30",
    icon: "M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z",
    label: "Custom",
  },
};

function EventIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className || "w-4 h-4"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function ProvenanceTimeline({ events }: { events: ProvenanceEvent[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No provenance events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />

      <div className="space-y-1">
        {events.map((event, idx) => {
          const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.custom;
          const isExpanded = expandedIdx === idx;
          const isLast = idx === events.length - 1;

          return (
            <div
              key={idx}
              className="relative pl-14 animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms`, opacity: 0 }}
            >
              {/* Node */}
              <div
                className={`absolute left-[14px] top-3 w-[22px] h-[22px] rounded-full border ${config.bg} flex items-center justify-center z-10`}
              >
                <EventIcon path={config.icon} className={`w-3 h-3 ${config.color}`} />
              </div>

              {/* Pulse on latest */}
              {isLast && (
                <div className="absolute left-[14px] top-3 w-[22px] h-[22px] rounded-full bg-primary/20 animate-ping" />
              )}

              {/* Card */}
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full text-left p-3 rounded-lg hover:bg-card/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      by {event.actor}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg
                      className="w-3 h-3 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      />
                    </svg>
                    <span className="text-xs text-muted-foreground">
                      {event.location}
                    </span>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 p-3 rounded-md bg-secondary/50 border border-border space-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Event Hash
                      </span>
                      <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">
                        {event.hash}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Previous Hash
                      </span>
                      <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">
                        {event.previousHash || "Genesis (no previous)"}
                      </p>
                    </div>
                    {event.data && Object.keys(event.data).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Metadata
                        </span>
                        <pre className="text-[11px] font-mono text-muted-foreground mt-0.5 overflow-x-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          idx === 0 || event.previousHash === events[idx - 1]?.hash
                            ? "bg-success"
                            : "bg-destructive"
                        }`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {idx === 0 || event.previousHash === events[idx - 1]?.hash
                          ? "Chain link verified"
                          : "Chain link BROKEN"}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
