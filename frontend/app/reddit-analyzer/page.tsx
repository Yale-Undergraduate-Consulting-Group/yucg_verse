"use client";

import { useCallback, useState } from "react";
import {
  ActionPanel,
  InputPanel,
  ResultsPanel,
  SettingsPanel,
  type RedditAnalysisResult,
  type MultiRedditAnalysisResult,
  type AnalysisMode,
} from "@/app/components/reddit-analyzer";
import ToolHero from "@/app/components/ToolHero";
import ToolDisclaimer from "@/app/components/ToolDisclaimer";
import { API_BASE_URL } from "../lib/constants";

type AnyResult = RedditAnalysisResult | MultiRedditAnalysisResult;

export default function RedditAnalyzerPage() {
  const [mode, setMode] = useState<AnalysisMode>("single");
  // single mode
  const [subreddit, setSubreddit] = useState("");
  // multi mode
  const [subreddits, setSubreddits] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("year");
  const [limit, setLimit] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<{ subreddit: string; error: string }[]>([]);

  const handleModeChange = useCallback((newMode: AnalysisMode) => {
    setMode(newMode);
    setResults(null);
    setError(null);
    setPartialErrors([]);
  }, []);

  const addSubreddit = useCallback((value: string) => {
    setSubreddits((prev) => {
      if (prev.includes(value) || prev.length >= 5) return prev;
      return [...prev, value];
    });
  }, []);

  const removeSubreddit = useCallback((value: string) => {
    setSubreddits((prev) => prev.filter((s) => s !== value));
  }, []);

  const handleRun = useCallback(async () => {
    if (mode === "single" && (!subreddit.trim() || !query.trim())) {
      setError("Please enter both a subreddit and search query.");
      return;
    }
    if (mode === "multi" && (subreddits.length < 2 || !query.trim())) {
      setError("Please add at least 2 subreddits and a search query.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);
    setPartialErrors([]);

    try {
      if (mode === "single") {
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
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data: RedditAnalysisResult = await response.json();
        if (!data.success) throw new Error(data.error || "Analysis failed");
        setResults(data);
      } else {
        const response = await fetch(`${API_BASE_URL}/api/reddit/analyze_multi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subreddits,
            query: query.trim(),
            time_filter: timeFilter,
            limit: limit ? parseInt(limit, 10) : null,
          }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data: MultiRedditAnalysisResult = await response.json();
        if (!data.success) throw new Error("Analysis failed");
        if (data.errors?.length > 0) setPartialErrors(data.errors);
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [mode, subreddit, subreddits, query, timeFilter, limit]);

  const handleDownloadCsv = useCallback(() => {
    if (!results?.csv_data) return;
    const blob = new Blob([results.csv_data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const name =
      mode === "single"
        ? `reddit_${subreddit}_${query.replace(/\s+/g, "_")}_sentiment.csv`
        : `reddit_multi_${query.replace(/\s+/g, "_")}_sentiment.csv`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, mode, subreddit, query]);

  const isDisabled =
    isRunning ||
    (mode === "single" ? !subreddit.trim() || !query.trim() : subreddits.length < 2 || !query.trim());

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <ToolHero
        label="Reddit Tool"
        title="Reddit Analyzer"
        description="Analyze sentiment of Reddit discussions on any topic across subreddits."
      />
      <ToolDisclaimer message="Our current sentiment model may produce inaccurate results. We are actively working on developing a more accurate solution." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <InputPanel
          mode={mode}
          onModeChange={handleModeChange}
          subreddit={subreddit}
          onSubredditChange={setSubreddit}
          subreddits={subreddits}
          onAddSubreddit={addSubreddit}
          onRemoveSubreddit={removeSubreddit}
          query={query}
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

      {partialErrors.length > 0 && (
        <ToolDisclaimer
          message={`Some subreddits could not be analyzed: ${partialErrors.map((e) => `r/${e.subreddit} (${e.error})`).join(", ")}`}
        />
      )}

      {results && (
        <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
          <ResultsPanel results={results} onDownloadCsv={handleDownloadCsv} />
        </section>
      )}
    </div>
  );
}
