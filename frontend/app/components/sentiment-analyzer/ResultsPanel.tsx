import type { AnalysisResult } from "./types";

interface ResultsPanelProps {
  results: AnalysisResult[];
}

function sentimentColor(sentiment: string | undefined) {
  if (sentiment === "positive") return "text-emerald-600";
  if (sentiment === "negative") return "text-red-600";
  return "text-text-secondary";
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
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
                {result.sentiment_distribution && (
                  <div>
                    <p className="mb-1 text-xs text-text-tertiary">Sentence breakdown</p>
                    <div className="flex gap-3 text-sm">
                      <span className="text-emerald-600">
                        +{result.sentiment_distribution.positive} positive
                      </span>
                      <span className="text-text-secondary">
                        {result.sentiment_distribution.neutral} neutral
                      </span>
                      <span className="text-red-600">
                        {result.sentiment_distribution.negative} negative
                      </span>
                    </div>
                  </div>
                )}

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
    </section>
  );
}
