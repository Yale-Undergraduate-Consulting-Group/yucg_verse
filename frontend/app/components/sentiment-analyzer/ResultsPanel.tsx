import type { AnalysisResult } from "./types";

interface ResultsPanelProps {
  results: AnalysisResult[];
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Results
      </h2>
      <div className="space-y-3">
        {results.map((result, idx) => (
          <div
            key={`${result.filename}-${idx}`}
            className="rounded-2xl border border-[var(--border)] bg-white/75 p-4"
          >
            <h3 className="mb-2 font-semibold text-text-primary">{result.filename}</h3>
            {result.error ? (
              <p className="text-sm text-red-600">{result.error}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-text-tertiary">Sentiment: </span>
                  <span
                    className={`font-medium ${
                      result.sentiment === "positive"
                        ? "text-emerald-600"
                        : result.sentiment === "negative"
                          ? "text-red-600"
                          : "text-text-secondary"
                    }`}
                  >
                    {result.sentiment}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary">Words: </span>
                  <span className="text-text-primary">{result.word_count ?? "-"}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Pages: </span>
                  <span className="text-text-primary">{result.page_count ?? "-"}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Positive words: </span>
                  <span className="text-text-primary">
                    {result.positive_word_count ?? "-"}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary">Negative words: </span>
                  <span className="text-text-primary">
                    {result.negative_word_count ?? "-"}
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary">Characters: </span>
                  <span className="text-text-primary">{result.char_count ?? "-"}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
