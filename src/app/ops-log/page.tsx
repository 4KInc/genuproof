"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OpsEntry {
  agent: string;
  trigger: string;
  productId: string;
  brandId: string;
  anomalyFlags: string[];
  geminiModel: string;
  aiSeverity: string;
  aiAttackVector: string;
  aiConfidence: number;
  latencyMs: number;
  timestamp: string;
}

interface OpsStats {
  totalOperations: number;
  agentBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  attackVectorBreakdown: Record<string, number>;
  avgLatencyMs: number;
  avgConfidence: number;
  geminiModel: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-700 bg-red-50 border-red-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-amber-700 bg-amber-50 border-amber-200",
  LOW: "text-zinc-600 bg-zinc-50 border-zinc-200",
};

export default function OpsLogPage() {
  const [entries, setEntries] = useState<OpsEntry[]>([]);
  const [stats, setStats] = useState<OpsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch("/api/ops-log?limit=50");
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries);
        setStats(data.stats);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide uppercase">Authentik</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <Link href="/analytics" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-3">AI Operations</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] tracking-tight leading-tight">
              Gemini <em className="text-accent">ops log.</em>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] text-muted-foreground">Auto-refreshing (15s)</span>
          </div>
        </div>

        {loading ? (
          <div className="text-[12px] text-muted-foreground py-16 text-center">Loading AI operations...</div>
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border mb-10">
                {[
                  { label: "Total AI Ops", value: String(stats.totalOperations) },
                  { label: "Gemini Model", value: stats.geminiModel || "—" },
                  { label: "Avg Latency", value: stats.avgLatencyMs ? `${stats.avgLatencyMs}ms` : "—" },
                  { label: "Avg Confidence", value: stats.avgConfidence ? `${stats.avgConfidence}%` : "—" },
                  { label: "Agents", value: String(Object.keys(stats.agentBreakdown).length) },
                ].map((s) => (
                  <div key={s.label} className="bg-background p-5">
                    <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">{s.label}</div>
                    <div className="font-[family-name:var(--font-display)] text-xl">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Breakdowns */}
            {stats && (
              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {/* Agent breakdown */}
                <div className="border border-border bg-card p-5">
                  <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">By Agent</div>
                  {Object.entries(stats.agentBreakdown).map(([agent, count]) => (
                    <div key={agent} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-[12px] font-mono">{agent}</span>
                      <span className="text-[12px] font-mono text-muted-foreground">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.agentBreakdown).length === 0 && (
                    <p className="text-[11px] text-muted-foreground/50">No operations yet</p>
                  )}
                </div>

                {/* Severity breakdown */}
                <div className="border border-border bg-card p-5">
                  <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">By AI Severity</div>
                  {Object.entries(stats.severityBreakdown).map(([sev, count]) => (
                    <div key={sev} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 border ${SEVERITY_COLORS[sev] || ""}`}>{sev}</span>
                      <span className="text-[12px] font-mono text-muted-foreground">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.severityBreakdown).length === 0 && (
                    <p className="text-[11px] text-muted-foreground/50">No classifications yet</p>
                  )}
                </div>

                {/* Attack vector breakdown */}
                <div className="border border-border bg-card p-5">
                  <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">By Attack Vector</div>
                  {Object.entries(stats.attackVectorBreakdown).map(([vec, count]) => (
                    <div key={vec} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-[11px] text-muted-foreground">{vec.replace(/_/g, " ")}</span>
                      <span className="text-[12px] font-mono text-muted-foreground">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.attackVectorBreakdown).length === 0 && (
                    <p className="text-[11px] text-muted-foreground/50">No vectors classified yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Log entries */}
            <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Recent Operations ({entries.length})
            </div>
            {entries.length === 0 ? (
              <div className="border border-dashed border-border py-16 text-center">
                <p className="text-[13px] text-muted-foreground">No AI operations logged yet.</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1">
                  Operations are logged when DynamoDB Streams triggers the Lambda and Gemini analyzes an anomaly.
                </p>
              </div>
            ) : (
              <div className="border border-border">
                {/* Header */}
                <div className="grid grid-cols-7 gap-px bg-border text-[8px] tracking-[0.15em] uppercase text-muted-foreground">
                  <div className="bg-secondary/50 px-3 py-2">Timestamp</div>
                  <div className="bg-secondary/50 px-3 py-2">Agent</div>
                  <div className="bg-secondary/50 px-3 py-2">Trigger</div>
                  <div className="bg-secondary/50 px-3 py-2">Severity</div>
                  <div className="bg-secondary/50 px-3 py-2">Vector</div>
                  <div className="bg-secondary/50 px-3 py-2">Confidence</div>
                  <div className="bg-secondary/50 px-3 py-2">Latency</div>
                </div>
                {/* Rows */}
                {entries.map((entry, i) => (
                  <div key={i} className="grid grid-cols-7 gap-px bg-border text-[11px]">
                    <div className="bg-background px-3 py-2.5 font-mono text-muted-foreground tabular-nums">
                      {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                    <div className="bg-background px-3 py-2.5 font-mono">{entry.agent}</div>
                    <div className="bg-background px-3 py-2.5 text-muted-foreground">{entry.trigger}</div>
                    <div className="bg-background px-3 py-2.5">
                      {entry.aiSeverity && (
                        <span className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 border ${SEVERITY_COLORS[entry.aiSeverity] || ""}`}>
                          {entry.aiSeverity}
                        </span>
                      )}
                    </div>
                    <div className="bg-background px-3 py-2.5 text-muted-foreground">
                      {entry.aiAttackVector?.replace(/_/g, " ") || "—"}
                    </div>
                    <div className="bg-background px-3 py-2.5 font-mono text-muted-foreground">
                      {entry.aiConfidence ? `${entry.aiConfidence}%` : "—"}
                    </div>
                    <div className="bg-background px-3 py-2.5 font-mono text-muted-foreground">
                      {entry.latencyMs ? `${entry.latencyMs}ms` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
