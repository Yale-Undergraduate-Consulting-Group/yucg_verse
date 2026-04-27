import { Star, TrendingUp, TrendingDown, ExternalLink, Download } from "lucide-react";
import type { GLocationResult, GReview } from "./types";
import { trackEvent } from "@/app/lib/analytics";

function downloadCSV(results: GLocationResult[]) {
  const rows: string[][] = [];
  rows.push([
    "Location", "Address", "Overall Rating", "Avg Sentiment",
    "Total Reviews Analyzed", "Sentiment", "Author", "Review Rating",
    "Date", "Review Text", "Sentiment Score",
  ]);

  for (const loc of results) {
    const allReviews = [...(loc.top_positive ?? []), ...(loc.top_negative ?? [])];
    // Deduplicate by text
    const seen = new Set<string>();
    const unique = allReviews.filter((r) => {
      if (seen.has(r.text)) return false;
      seen.add(r.text);
      return true;
    });

    if (unique.length === 0) {
      rows.push([
        loc.name, loc.address,
        loc.rating?.toString() ?? "",
        loc.avg_sentiment?.toString() ?? "",
        loc.total_reviews_analyzed?.toString() ?? "",
        "", "", "", "", "", "",
      ]);
    } else {
      for (const r of unique) {
        rows.push([
          loc.name, loc.address,
          loc.rating?.toString() ?? "",
          loc.avg_sentiment?.toString() ?? "",
          loc.total_reviews_analyzed?.toString() ?? "",
          r.sentiment_label,
          r.author,
          r.rating?.toString() ?? "",
          r.date,
          r.text.replace(/\n/g, " "),
          r.sentiment_compound?.toString() ?? "",
        ]);
      }
    }
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "google_reviews_sentiment.csv";
  a.click();
  URL.revokeObjectURL(url);

  trackEvent("csv_downloaded", { tool: "google_reviews", location_count: results.length });
}

function sentimentBadge(label: string) {
  if (label === "positive") return "bg-emerald-50 text-emerald-700";
  if (label === "negative") return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function sentimentColor(compound: number) {
  if (compound >= 0.05) return "text-emerald-600";
  if (compound <= -0.05) return "text-red-600";
  return "text-text-secondary";
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, variant }: { review: GReview; variant: "positive" | "negative" }) {
  const border = variant === "positive"
    ? "border-emerald-200 bg-emerald-50/50"
    : "border-red-200 bg-red-50/50";
  const scoreColor = variant === "positive" ? "text-emerald-600" : "text-red-600";

  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <StarRow rating={review.rating} />
          <span className="truncate text-xs font-medium text-text-secondary">{review.author}</span>
          {review.date && (
            <span className="shrink-0 text-xs text-text-tertiary">{review.date}</span>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold ${scoreColor}`}>
          {review.sentiment_compound >= 0 ? "+" : ""}
          {review.sentiment_compound.toFixed(3)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-primary">{review.text}</p>
      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${sentimentBadge(review.sentiment_label)}`}>
        {review.sentiment_label}
      </span>
    </div>
  );
}

function LocationCard({ result, x }: { result: GLocationResult; x: number }) {
  const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${result.place_id}`;

  if (result.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/50 p-5">
        <p className="font-semibold text-text-primary">{result.name}</p>
        <p className="mt-1 text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary">{result.name}</h3>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary transition-colors hover:text-accent"
              title="View on Google Maps"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">{result.address}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            {result.rating && (
              <span className="flex items-center gap-1 font-medium text-amber-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {result.rating.toFixed(1)}
                <span className="font-normal text-text-tertiary">
                  ({result.review_count.toLocaleString()} Google reviews)
                </span>
              </span>
            )}
            <span className="text-text-tertiary">
              {result.total_reviews_analyzed} reviews analyzed
            </span>
          </div>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-center ${
          result.avg_sentiment >= 0.05
            ? "border-emerald-200 bg-emerald-50"
            : result.avg_sentiment <= -0.05
            ? "border-red-200 bg-red-50"
            : "border-[var(--border)] bg-white/70"
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Avg Sentiment
          </p>
          <p className={`text-xl font-bold ${sentimentColor(result.avg_sentiment)}`}>
            {result.avg_sentiment >= 0 ? "+" : ""}{result.avg_sentiment.toFixed(3)}
          </p>
        </div>
      </div>

      {result.total_reviews_analyzed === 0 ? (
        <p className="text-sm text-text-tertiary">No text reviews found for this location.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-emerald-700">
                Top {Math.min(x, result.top_positive.length)} Most Positive
              </h4>
            </div>
            <div className="space-y-3">
              {result.top_positive.length > 0
                ? result.top_positive.map((r, i) => (
                    <ReviewCard key={i} review={r} variant="positive" />
                  ))
                : <p className="text-xs text-text-tertiary">No positive reviews found.</p>
              }
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <h4 className="text-sm font-semibold text-red-700">
                Top {Math.min(x, result.top_negative.length)} Most Negative
              </h4>
            </div>
            <div className="space-y-3">
              {result.top_negative.length > 0
                ? result.top_negative.map((r, i) => (
                    <ReviewCard key={i} review={r} variant="negative" />
                  ))
                : <p className="text-xs text-text-tertiary">No negative reviews found.</p>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultsPanelProps {
  results: GLocationResult[];
  x: number;
}

export default function ResultsPanel({ results, x }: ResultsPanelProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Results — {results.length} location{results.length !== 1 ? "s" : ""}
        </h2>
        <button
          onClick={() => downloadCSV(results)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-all hover:border-accent hover:text-accent"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </button>
      </div>
      {results.map((result) => (
        <LocationCard key={result.place_id} result={result} x={x} />
      ))}
    </section>
  );
}
