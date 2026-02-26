"use client";

import { useCallback, useState } from "react";
import {
  ActionPanel,
  InputPanel,
  RedditHero,
  ResultsPanel,
  SettingsPanel,
  type RedditAnalysisResult,
} from "@/app/components/reddit-analyzer";
import { API_BASE_URL } from "../lib/constants";

export default function RedditAnalyzerPage() {
  const [subreddit, setSubreddit] = useState("");
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("year");
  const [limit, setLimit] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RedditAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!subreddit.trim() || !query.trim()) {
      setError("Please enter both a subreddit and search query.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/reddit/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subreddit: subreddit.trim(),
          query: query.trim(),
          time_filter: timeFilter,
          limit: limit ? parseInt(limit, 10) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [subreddit, query, timeFilter, limit]);

  const handleDownloadCsv = useCallback(() => {
    if (!results?.csv_data) return;

    const blob = new Blob([results.csv_data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reddit_${subreddit}_${query.replace(/\s+/g, "_")}_sentiment.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, subreddit, query]);

  const isDisabled = isRunning || !subreddit.trim() || !query.trim();

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <RedditHero
        summary={results?.summary ?? null}
        subreddit={subreddit}
        query={query}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <InputPanel
          subreddit={subreddit}
          query={query}
          onSubredditChange={setSubreddit}
          onQueryChange={setQuery}
          error={error}
        />

        <aside className="space-y-4">
          <SettingsPanel
            timeFilter={timeFilter}
            limit={limit}
            onTimeFilterChange={setTimeFilter}
            onLimitChange={setLimit}
          />
          <ActionPanel
            isRunning={isRunning}
            disabled={isDisabled}
            onRun={handleRun}
          />
        </aside>
      </div>

      {results && (
        <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
          <ResultsPanel results={results} onDownloadCsv={handleDownloadCsv} />
        </section>
      )}
    </div>
  );
}
