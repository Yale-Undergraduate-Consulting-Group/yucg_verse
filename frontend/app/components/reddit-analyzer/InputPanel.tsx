import { Search, X, Plus } from "lucide-react";
import { useState, useCallback } from "react";

export type AnalysisMode = "single" | "multi";

interface InputPanelProps {
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  // single mode
  subreddit: string;
  onSubredditChange: (value: string) => void;
  // multi mode
  subreddits: string[];
  onAddSubreddit: (value: string) => void;
  onRemoveSubreddit: (value: string) => void;
  // shared
  query: string;
  onQueryChange: (value: string) => void;
  error: string | null;
}

export default function InputPanel({
  mode,
  onModeChange,
  subreddit,
  onSubredditChange,
  subreddits,
  onAddSubreddit,
  onRemoveSubreddit,
  query,
  onQueryChange,
  error,
}: InputPanelProps) {
  const [chipInput, setChipInput] = useState("");

  const commitChip = useCallback(() => {
    const val = chipInput.trim().toLowerCase().replace(/^r\//, "");
    if (val && !subreddits.includes(val) && subreddits.length < 5) {
      onAddSubreddit(val);
    }
    setChipInput("");
  }, [chipInput, subreddits, onAddSubreddit]);

  const handleChipKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitChip();
      } else if (e.key === "Backspace" && chipInput === "" && subreddits.length > 0) {
        onRemoveSubreddit(subreddits[subreddits.length - 1]);
      }
    },
    [chipInput, subreddits, commitChip, onRemoveSubreddit]
  );

  const instructions =
    mode === "single"
      ? 'Enter a subreddit name (without "r/") and a search query to analyze sentiment of Reddit discussions. Supports Reddit search syntax like "term1 OR term2" or "-excludeterm".'
      : 'Add 2–5 subreddits to compare sentiment across communities for the same query. Results will show a per-subreddit breakdown alongside combined data.';

  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      {/* Mode toggle */}
      <div className="mb-5 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white/60 p-1">
        {(["single", "multi"] as AnalysisMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all duration-150 ${
              mode === m
                ? "bg-accent text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m === "single" ? "Single Subreddit" : "Multi-Subreddit"}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Instructions:</span>{" "}
        {instructions}
      </div>

      <div className="space-y-4">
        {/* Single mode: simple text input */}
        {mode === "single" && (
          <div>
            <label
              htmlFor="subreddit"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Subreddit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
                r/
              </span>
              <input
                id="subreddit"
                type="text"
                value={subreddit}
                onChange={(e) => onSubredditChange(e.target.value)}
                placeholder="travel"
                className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-3 pl-8 pr-4 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        {/* Multi mode: chip input */}
        {mode === "multi" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Subreddits
              </label>
              <span className="text-xs text-text-tertiary">
                {subreddits.length}/5 added
              </span>
            </div>
            {/* Chips display */}
            {subreddits.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {subreddits.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-3 py-1 text-sm font-medium text-accent"
                  >
                    r/{s}
                    <button
                      onClick={() => onRemoveSubreddit(s)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent/20"
                      aria-label={`Remove r/${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Input row */}
            {subreddits.length < 5 && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
                    r/
                  </span>
                  <input
                    type="text"
                    value={chipInput}
                    onChange={(e) => setChipInput(e.target.value)}
                    onKeyDown={handleChipKeyDown}
                    placeholder="consulting"
                    className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-3 pl-8 pr-4 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <button
                  onClick={commitChip}
                  disabled={!chipInput.trim()}
                  className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent-muted px-4 py-3 text-sm font-medium text-accent transition-all hover:bg-accent-muted-strong disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        {/* Query — shared */}
        <div>
          <label
            htmlFor="query"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Search Query
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              id="query"
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Turkish Airlines"
              className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}
