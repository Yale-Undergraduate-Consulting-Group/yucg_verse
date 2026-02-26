import type { RedditSummary } from "./types";

interface RedditHeroProps {
  summary: RedditSummary | null;
  subreddit: string;
  query: string;
}

export default function RedditHero({
  summary,
  subreddit,
  query,
}: RedditHeroProps) {
  const posPercent = summary?.sentiment_percentages?.positive ?? 0;
  const negPercent = summary?.sentiment_percentages?.negative ?? 0;
  const avgSentiment = summary?.avg_combined_sentiment ?? 0;
  const totalPosts = summary?.total_posts ?? 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[linear-gradient(120deg,#1d4ed8_0%,#2563eb_42%,#0ea5e9_100%)] p-7 text-white sm:p-8">
      <div className="absolute right-12 top-4 h-20 w-20 rounded-full border border-white/20" />
      <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-white/12 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Reddit Tool
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl [font-family:var(--font-plus-jakarta)]">
            Reddit Analyzer
          </h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">
            {subreddit && query
              ? `Analyzing "${query}" in r/${subreddit}`
              : "Analyze sentiment of Reddit discussions on any topic across subreddits."}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Posts</p>
            <p className="mt-0.5 text-lg font-semibold">{totalPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Positive</p>
            <p className="mt-0.5 text-lg font-semibold">{posPercent}%</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Negative</p>
            <p className="mt-0.5 text-lg font-semibold">{negPercent}%</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Avg Score</p>
            <p className="mt-0.5 text-lg font-semibold">{avgSentiment.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
