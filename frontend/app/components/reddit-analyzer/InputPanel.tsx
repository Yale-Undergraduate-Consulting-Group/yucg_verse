import { Search } from "lucide-react";

interface InputPanelProps {
  subreddit: string;
  query: string;
  onSubredditChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  error: string | null;
}

export default function InputPanel({
  subreddit,
  query,
  onSubredditChange,
  onQueryChange,
  error,
}: InputPanelProps) {
  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Instructions:</span>{" "}
        Enter a subreddit name (without &quot;r/&quot;) and a search query to analyze
        sentiment of Reddit discussions. Supports Reddit search syntax like
        &quot;term1 OR term2&quot; or &quot;-excludeterm&quot;.
      </div>

      <div className="space-y-4">
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
