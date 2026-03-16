import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { AnalysisResult, TopWord } from "./types";
import { API_BASE_URL } from "@/app/lib/constants";

interface ResultsPanelProps {
  results: AnalysisResult[];
  overallPlot?: string | null;
  wordStats?: TopWord[] | null;
  company: string;   // ← new prop passed from page.tsx
}

function sentimentColor(sentiment: string | undefined) {
  if (sentiment === "positive") return "text-emerald-600";
  if (sentiment === "negative") return "text-red-600";
  return "text-text-secondary";
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export default function ResultsPanel({
  results,
  overallPlot,
  wordStats,
  company,
}: ResultsPanelProps) {
  // Derive default axis labels from the company name so they always match
  const defaultTitle  = `Word / Word Groups Associated with ${company}: Frequency vs Sentiment`;
  const defaultXLabel = `Frequency (number of ${company}-related sentences containing word/group)`;
  const defaultYLabel = `Average sentiment towards ${company} (compound score)`;

  const [displayedPlot, setDisplayedPlot] = useState(overallPlot ?? null);
  const [title,  setTitle]  = useState(defaultTitle);
  const [xlabel, setXLabel] = useState(defaultXLabel);
  const [ylabel, setYLabel] = useState(defaultYLabel);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Reset labels and plot whenever a new analysis result arrives
  useEffect(() => {
    setDisplayedPlot(overallPlot ?? null);
    setTitle(defaultTitle);
    setXLabel(defaultXLabel);
    setYLabel(defaultYLabel);
  }, [overallPlot, company]);

  async function handleRegeneratePlot() {
    if (!wordStats) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/regenerate_plot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_stats: wordStats,
          company,       // ← pass company to backend so filename is correct
          title,
          xlabel,
          ylabel,
        }),
      });
      const data = await res.json();
      if (data.overall_plot) setDisplayedPlot(data.overall_plot);
    } finally {
      setIsRegenerating(false);
    }
  }

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
                      {result.avg_compound != null
                        ? result.avg_compound.toFixed(3)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Sentences</p>
                    <p className="font-medium text-text-primary">
                      {result.sentence_count ?? "-"}
                    </p>
                  </div>
                  <div>
                    {/* Label uses the actual company name from the result */}
                    <p className="text-text-tertiary">
                      {result.target_company ?? company} / Other
                    </p>
                    <p className="font-medium text-text-primary">
                      {result.target_sentence_count ?? "-"} /{" "}
                      {result.other_service_count ?? "-"}
                    </p>
                  </div>
                </div>

                {/* Sentiment distribution */}
                {result.sentiment_distribution &&
                  (() => {
                    const { positive, neutral, negative } =
                      result.sentiment_distribution;
                    const total = positive + neutral + negative;
                    const posP  = pct(positive, total);
                    const neutP = pct(neutral,  total);
                    const negP  = pct(negative, total);
                    return (
                      <div>
                        <p className="mb-1 text-xs text-text-tertiary">
                          Sentence breakdown
                        </p>
                        <div className="mb-2 flex gap-3 text-sm">
                          <span className="text-emerald-600">
                            +{positive} positive
                          </span>
                          <span className="text-text-secondary">
                            {neutral} neutral
                          </span>
                          <span className="text-red-600">
                            {negative} negative
                          </span>
                        </div>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                          {posP  > 0 && <div className="bg-emerald-400" style={{ width: `${posP}%`  }} />}
                          {neutP > 0 && <div className="bg-gray-300"    style={{ width: `${neutP}%` }} />}
                          {negP  > 0 && <div className="bg-red-400"     style={{ width: `${negP}%`  }} />}
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-text-tertiary">
                          {posP  > 0 && <span className="text-emerald-600">{posP}%</span>}
                          {neutP > 0 && <span>{neutP}%</span>}
                          {negP  > 0 && <span className="text-red-500">{negP}%</span>}
                        </div>
                      </div>
                    );
                  })()}

                {/* Top company-associated words */}
                {result.top_words && result.top_words.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs text-text-tertiary">
                      Top {result.target_company ?? company}-associated words
                    </p>
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

      {displayedPlot && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Overall Sentiment Frequency Analysis
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-white/75 p-4 space-y-4">
            {/* Label editors */}
            <div className="space-y-2">
              {(
                [
                  { label: "Title",  value: title,  setter: setTitle  },
                  { label: "X-axis", value: xlabel, setter: setXLabel },
                  { label: "Y-axis", value: ylabel, setter: setYLabel },
                ] as const
              ).map(({ label, value, setter }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-xs text-text-tertiary">
                    {label}
                  </span>
                  <input
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-white/80 px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  onClick={handleRegeneratePlot}
                  disabled={isRegenerating || !wordStats}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60"
                >
                  {isRegenerating && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {isRegenerating ? "Updating…" : "Update labels"}
                </button>
              </div>
            </div>

            {/* Plot */}
            <img
              src={`data:image/png;base64,${displayedPlot}`}
              alt={`Word frequency vs sentiment scatter plot for ${company}`}
              className="w-full rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}

