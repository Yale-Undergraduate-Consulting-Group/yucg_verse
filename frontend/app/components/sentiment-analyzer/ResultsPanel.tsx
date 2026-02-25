import type { AnalysisResult } from "./types";

interface ResultsPanelProps {
  results: AnalysisResult[];
  overallPlot?: string | null;
}

function sentimentColor(sentiment: string | undefined) {
  if (sentiment === "positive") return "text-emerald-600";
  if (sentiment === "negative") return "text-red-600";
  return "text-text-secondary";
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export default function ResultsPanel({ results, overallPlot }: ResultsPanelProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Results
      </h2>
      <div className="space-y-4">
        {results.map((result, idx) => (
          <div
            key={`${result.filename}-${idx}`}
            className="rounded-2xl border border-[var(--border)] bg-white/75 p-4"
          >
            <h3 className="mb-3 font-semibold text-text-primary">
              {result.interviewee ?? result.filename}
            </h3>

            {result.error ? (
              <p className="text-sm text-red-600">{result.error}</p>
            ) : (
              <div className="space-y-4">
                {/* Core stats */}
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-text-tertiary">Overall sentiment</p>
                    <p className={`font-medium ${sentimentColor(result.sentiment)}`}>
                      {result.sentiment ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Avg score</p>
                    <p className="font-medium text-text-primary">
                      {result.avg_compound != null ? result.avg_compound.toFixed(3) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Sentences</p>
                    <p className="font-medium text-text-primary">
                      {result.sentence_count ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Canva / Other</p>
                    <p className="font-medium text-text-primary">
                      {result.canva_sentence_count ?? "-"} / {result.other_service_count ?? "-"}
                    </p>
                  </div>
                </div>

                {/* Sentiment distribution */}
                {result.sentiment_distribution && (() => {
                  const { positive, neutral, negative } = result.sentiment_distribution;
                  const total = positive + neutral + negative;
                  const posP = pct(positive, total);
                  const neutP = pct(neutral, total);
                  const negP = pct(negative, total);
                  return (
                    <div>
                      <p className="mb-1 text-xs text-text-tertiary">Sentence breakdown</p>
                      {/* Counts */}
                      <div className="mb-2 flex gap-3 text-sm">
                        <span className="text-emerald-600">+{positive} positive</span>
                        <span className="text-text-secondary">{neutral} neutral</span>
                        <span className="text-red-600">{negative} negative</span>
                      </div>
                      {/* Stacked percentage bar */}
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        {posP  > 0 && <div className="bg-emerald-400" style={{ width: `${posP}%` }} />}
                        {neutP > 0 && <div className="bg-gray-300"    style={{ width: `${neutP}%` }} />}
                        {negP  > 0 && <div className="bg-red-400"     style={{ width: `${negP}%` }} />}
                      </div>
                      {/* Percentage labels */}
                      <div className="mt-1 flex gap-3 text-xs text-text-tertiary">
                        {posP  > 0 && <span className="text-emerald-600">{posP}%</span>}
                        {neutP > 0 && <span>{neutP}%</span>}
                        {negP  > 0 && <span className="text-red-500">{negP}%</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Top Canva-associated words */}
                {result.top_words && result.top_words.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-text-tertiary">Top Canva-associated words</p>
                    <div className="flex flex-wrap gap-2">
                      {result.top_words.map((w) => (
                        <span
                          key={w.word}
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            w.avg_hf_compound >= 0.05
                              ? "bg-emerald-50 text-emerald-700"
                              : w.avg_hf_compound <= -0.05
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-text-secondary"
                          }`}
                        >
                          {w.word} ({w.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {overallPlot && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Overall Sentiment Frequency Analysis
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-white/75 p-4">
            <p className="mb-3 text-xs text-text-tertiary">
              Word frequency × sentiment — aggregated across all transcripts
            </p>
            <img
              src={`data:image/png;base64,${overallPlot}`}
              alt="Word frequency vs sentiment scatter plot"
              className="w-full rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
