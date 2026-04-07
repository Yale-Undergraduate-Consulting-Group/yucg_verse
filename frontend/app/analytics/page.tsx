"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/app/lib/constants";
import PageViewTracker from "@/app/components/PageViewTracker";
import ToolHero from "@/app/components/ToolHero";

interface AnalyticsSummary {
  total_page_views: number;
  page_views_breakdown: Record<string, number>;
  total_transcript_analyses: number;
  total_transcripts_uploaded: number;
  total_graphs_generated: number;
  total_plots_regenerated: number;
  total_reddit_analyses: number;
  total_subreddits_analyzed: number;
  total_csv_downloads: number;
  recent_events: {
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    page_view:            "bg-blue-100 text-blue-700",
    transcript_analysis:  "bg-purple-100 text-purple-700",
    graph_generated:      "bg-green-100 text-green-700",
    plot_regenerated:     "bg-teal-100 text-teal-700",
    reddit_analysis:      "bg-orange-100 text-orange-700",
    csv_downloaded:       "bg-yellow-100 text-yellow-700",
  };
  const cls = colors[type] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/analytics/summary`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageViewTracker page="analytics" />
      <ToolHero
        label="Usage Metrics"
        title="Analytics"
        description="Track site traffic, tool usage, and analysis activity."
      />

      {loading && (
        <p className="text-sm text-text-tertiary">Loading analytics…</p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load analytics: {error}
        </div>
      )}

      {data && (
        <>
          {/* ── Overview stats ────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="Total Page Views"          value={data.total_page_views} />
              <StatCard label="Transcript Analyses"       value={data.total_transcript_analyses} />
              <StatCard label="Transcripts Uploaded"      value={data.total_transcripts_uploaded} />
              <StatCard label="Graphs Generated"          value={data.total_graphs_generated} />
              <StatCard label="Plots Regenerated"         value={data.total_plots_regenerated} />
              <StatCard label="Reddit Analyses"           value={data.total_reddit_analyses} />
              <StatCard label="Subreddits Analyzed"       value={data.total_subreddits_analyzed} />
              <StatCard label="CSV Downloads"             value={data.total_csv_downloads} />
            </div>
          </section>

          {/* ── Page views breakdown ──────────────────────────────────── */}
          {Object.keys(data.page_views_breakdown).length > 0 && (
            <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Page Views by Page
              </h2>
              <div className="space-y-2">
                {Object.entries(data.page_views_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([page, count]) => {
                    const pct = Math.round((count / data.total_page_views) * 100);
                    return (
                      <div key={page}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-text-primary">/{page === "home" ? "" : page}</span>
                          <span className="text-text-tertiary">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* ── Recent events ─────────────────────────────────────────── */}
          {data.recent_events.length > 0 && (
            <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Recent Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)] text-left text-xs text-text-tertiary">
                      <th className="pb-2 pr-4 font-semibold">Event</th>
                      <th className="pb-2 pr-4 font-semibold">Details</th>
                      <th className="pb-2 font-semibold">Time (UTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--panel-border)]">
                    {data.recent_events.map((ev, i) => (
                      <tr key={i} className="text-text-primary">
                        <td className="py-2.5 pr-4">
                          <EventTypeBadge type={ev.event_type} />
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-text-tertiary">
                          {Object.entries(ev.metadata)
                            .filter(([, v]) => v !== null && v !== undefined)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </td>
                        <td className="py-2.5 text-xs text-text-tertiary">
                          {ev.created_at.replace("T", " ").slice(0, 19)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.recent_events.length === 0 && (
            <p className="text-sm text-text-tertiary">No activity recorded yet. Use the tools to start tracking.</p>
          )}
        </>
      )}
    </div>
  );
}
