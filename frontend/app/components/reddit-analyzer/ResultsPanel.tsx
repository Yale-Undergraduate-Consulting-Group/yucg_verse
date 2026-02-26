import { Download, ExternalLink, TrendingUp, MessageSquare } from "lucide-react";
import type { RedditAnalysisResult, Keyword, RedditPost, MonthlyTrend } from "./types";

interface ResultsPanelProps {
  results: RedditAnalysisResult;
  onDownloadCsv: () => void;
}

function sentimentColor(label: string) {
  if (label === "positive") return "text-emerald-600";
  if (label === "negative") return "text-red-600";
  return "text-text-secondary";
}

function sentimentBadgeClass(label: string) {
  if (label === "positive") return "bg-emerald-50 text-emerald-700";
  if (label === "negative") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-text-secondary";
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
  if (!data || data.length === 0) return null;

  const maxSentiment = Math.max(...data.map((d) => Math.abs(d.avg_sentiment)), 0.1);
  const barMaxHeight = 60; // pixels

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-xs font-medium text-text-tertiary">Monthly Sentiment Trend</h3>
      <div className="flex items-end gap-1" style={{ height: `${barMaxHeight + 20}px` }}>
        {data.map((month, idx) => {
          const barHeight = (Math.abs(month.avg_sentiment) / maxSentiment) * barMaxHeight;
          const isPositive = month.avg_sentiment >= 0;
          return (
            <div
              key={`${month.year}-${month.month}-${idx}`}
              className="flex-1 flex flex-col items-center justify-end"
              style={{ height: `${barMaxHeight + 20}px` }}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isPositive ? "bg-emerald-400" : "bg-red-400"
                }`}
                style={{ height: `${Math.max(barHeight, 4)}px` }}
                title={`${month.year}-${String(month.month).padStart(2, "0")}: ${month.avg_sentiment.toFixed(3)} (${month.post_count} posts)`}
              />
              <span className="mt-1 text-[9px] text-text-tertiary whitespace-nowrap">
                {month.month}/{String(month.year).slice(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeywordsSection({ keywords }: { keywords: Keyword[] }) {
  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-xs font-medium text-text-tertiary">Top Keywords</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, 20).map((kw) => (
          <span
            key={kw.word}
            className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            title={`Keyness: ${kw.keyness}, Count: ${kw.count}`}
          >
            {kw.word} ({kw.count})
          </span>
        ))}
      </div>
    </div>
  );
}

function PostsTable({ posts }: { posts: RedditPost[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Top Posts
      </h3>
      <div className="max-h-[400px] overflow-y-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white/95 backdrop-blur">
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Title</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Subreddit</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Score</th>
              <th className="px-3 py-2 text-center font-medium text-text-secondary">Sentiment</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Date</th>
            </tr>
          </thead>
          <tbody>
            {posts.slice(0, 50).map((post) => (
              <tr
                key={post.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-3 py-2.5">
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1.5 text-text-primary hover:text-accent"
                  >
                    <span className="line-clamp-2">{truncateText(post.title, 80)}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </td>
                <td className="px-3 py-2.5 text-text-secondary">r/{post.subreddit}</td>
                <td className="px-3 py-2.5 text-right font-medium text-text-primary">
                  {post.score.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${sentimentBadgeClass(
                      post.sentiment_label
                    )}`}
                  >
                    {post.sentiment_label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-text-tertiary">
                  {formatDate(post.created_utc)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultsPanel({ results, onDownloadCsv }: ResultsPanelProps) {
  const { summary, monthly_trend, top_keywords, posts } = results;
  const { positive, neutral, negative } = summary.sentiment_distribution;
  const total = positive + neutral + negative;
  const posP = total > 0 ? Math.round((positive / total) * 100) : 0;
  const neutP = total > 0 ? Math.round((neutral / total) * 100) : 0;
  const negP = total > 0 ? Math.round((negative / total) * 100) : 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Results
        </h2>
        <button
          onClick={onDownloadCsv}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white/75 p-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-text-tertiary">Total Posts</p>
            <p className="flex items-center gap-1.5 font-medium text-text-primary">
              <MessageSquare className="h-4 w-4 text-accent" />
              {summary.total_posts.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">Avg Sentiment</p>
            <p className={`flex items-center gap-1.5 font-medium ${sentimentColor(
              summary.avg_combined_sentiment >= 0.05
                ? "positive"
                : summary.avg_combined_sentiment <= -0.05
                  ? "negative"
                  : "neutral"
            )}`}>
              <TrendingUp className="h-4 w-4" />
              {summary.avg_combined_sentiment.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">Title Sentiment</p>
            <p className="font-medium text-text-primary">
              {summary.avg_title_sentiment.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">Text Sentiment</p>
            <p className="font-medium text-text-primary">
              {summary.avg_text_sentiment.toFixed(3)}
            </p>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="mt-4">
          <p className="mb-1 text-xs text-text-tertiary">Sentiment Distribution</p>
          <div className="mb-2 flex gap-3 text-sm">
            <span className="text-emerald-600">+{positive} positive</span>
            <span className="text-text-secondary">{neutral} neutral</span>
            <span className="text-red-600">{negative} negative</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            {posP > 0 && <div className="bg-emerald-400" style={{ width: `${posP}%` }} />}
            {neutP > 0 && <div className="bg-gray-300" style={{ width: `${neutP}%` }} />}
            {negP > 0 && <div className="bg-red-400" style={{ width: `${negP}%` }} />}
          </div>
          <div className="mt-1 flex gap-3 text-xs text-text-tertiary">
            {posP > 0 && <span className="text-emerald-600">{posP}%</span>}
            {neutP > 0 && <span>{neutP}%</span>}
            {negP > 0 && <span className="text-red-500">{negP}%</span>}
          </div>
        </div>

        <MonthlyTrendChart data={monthly_trend} />
        <KeywordsSection keywords={top_keywords} />
      </div>

      <PostsTable posts={posts} />
    </section>
  );
}
