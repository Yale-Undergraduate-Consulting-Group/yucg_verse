"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/app/lib/constants";
import ToolHero from "@/app/components/ToolHero";

interface AnalyticsSummary {
  total_page_views: number;
  page_views_breakdown: Record<string, number>;
  unique_clients: number;
  unique_sessions: number;
  total_transcript_analyses: number;
  total_transcript_failures: number;
  total_transcripts_uploaded: number;
  total_graphs_generated: number;
  total_plots_regenerated: number;
  total_reddit_analyses: number;
  total_reddit_failures: number;
  total_subreddits_analyzed: number;
  reddit_mode_breakdown: { single: number; multi: number };
  total_text_units_analyzed: number;
  total_sentences_analyzed: number;
  total_posts_analyzed: number;
  total_reviews_analyzed: number;
  total_google_analyses: number;
  total_google_failures: number;
  total_places_analyzed: number;
  total_csv_downloads: number;
  recent_events: {
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-text-tertiary">{sub}</p>}
    </div>
  );
}

function FailStat({ label, success, failed }: { label: string; success: number; failed: number }) {
  const total = success + failed;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{success.toLocaleString()}</p>
      <p className="mt-1 text-xs text-text-tertiary">
        {failed > 0
          ? <span className="text-red-500">{failed} failed</span>
          : "no failures"
        }
        {total > 0 && <span className="ml-1">· {rate}% success rate</span>}
      </p>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    page_view:           "bg-blue-100 text-blue-700",
    transcript_analysis: "bg-purple-100 text-purple-700",
    graph_generated:     "bg-green-100 text-green-700",
    plot_regenerated:    "bg-teal-100 text-teal-700",
    reddit_analysis:          "bg-orange-100 text-orange-700",
    google_reviews_analysis:  "bg-blue-100 text-blue-700",
    csv_downloaded:           "bg-yellow-100 text-yellow-700",
  };
  const cls = colors[type] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

// ── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("analytics_auth", "1");
        onAuth();
      } else {
        setError(data.error ?? "Incorrect password");
      }
    } catch {
      setError("Could not reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8">
        <h2 className="mb-1 text-lg font-semibold text-text-primary">Analytics Access</h2>
        <p className="mb-6 text-sm text-text-tertiary">Enter the analytics password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/80 px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard() {
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

  if (loading) return <p className="text-sm text-text-tertiary">Loading analytics…</p>;
  if (error) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
      Failed to load analytics: {error}
    </div>
  );
  if (!data) return null;

  return (
    <>
      {/* ── Cumulative impact ───────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Cumulative Text Analyzed
        </h2>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Total</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{data.total_text_units_analyzed.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-text-tertiary">sentences · posts · reviews</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Transcript Sentences</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.total_sentences_analyzed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Reddit Posts</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.total_posts_analyzed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Google Reviews</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{data.total_reviews_analyzed.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* ── Audience ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Audience
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total Page Views"    value={data.total_page_views} sub="analytics page excluded" />
          <StatCard label="Unique Users"        value={data.unique_clients}   sub="by persistent client ID" />
          <StatCard label="Unique Sessions"     value={data.unique_sessions}  sub="by session ID" />
        </div>
      </section>

      {/* ── Tool usage ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Tool Usage
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <FailStat label="Transcript Analyses" success={data.total_transcript_analyses} failed={data.total_transcript_failures} />
          <StatCard label="Transcripts Uploaded" value={data.total_transcripts_uploaded} />
          <StatCard label="Graphs Generated"     value={data.total_graphs_generated} />
          <StatCard label="Plots Regenerated"    value={data.total_plots_regenerated} />
          <FailStat label="Reddit Analyses"         success={data.total_reddit_analyses}  failed={data.total_reddit_failures} />
          <StatCard label="Subreddits Analyzed"    value={data.total_subreddits_analyzed} />
          <FailStat label="Google Reviews Analyses" success={data.total_google_analyses}  failed={data.total_google_failures} />
          <StatCard label="Locations Analyzed"     value={data.total_places_analyzed} />
          <StatCard label="CSV Downloads"          value={data.total_csv_downloads} />
        </div>
      </section>

      {/* ── Reddit mode breakdown ────────────────────────────────────────── */}
      {(data.reddit_mode_breakdown.single > 0 || data.reddit_mode_breakdown.multi > 0) && (
        <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Reddit Analysis Mode
          </h2>
          <div className="flex gap-8">
            {(["single", "multi"] as const).map((mode) => {
              const count = data.reddit_mode_breakdown[mode];
              const total = data.reddit_mode_breakdown.single + data.reddit_mode_breakdown.multi;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={mode}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary capitalize">{mode}</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">{count.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{pct}% of analyses</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Page views breakdown ─────────────────────────────────────────── */}
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
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* ── Recent events ────────────────────────────────────────────────── */}
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
                        .filter(([k, v]) => v !== null && v !== undefined && k !== "client_id" && k !== "session_id")
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
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("analytics_auth") === "1") {
      setAuthed(true);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <ToolHero
        label="Usage Metrics"
        title="Analytics"
        description="Track site traffic, tool usage, and analysis activity."
      />
      {authed ? <Dashboard /> : <PasswordGate onAuth={() => setAuthed(true)} />}
    </div>
  );
}
