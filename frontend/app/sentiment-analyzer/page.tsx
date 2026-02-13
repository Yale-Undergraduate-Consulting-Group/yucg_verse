import Sidebar from "../components/Sidebar";

export default function SentimentAnalyzerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-60">
        {/* Header bar */}
        <div className="h-14 px-6 flex items-center border-b border-border">
          <span className="text-text-primary font-medium">
            Sentiment Analyzer
          </span>
        </div>

        {/* Content area */}
        <div className="p-10">
          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            Interview Sentiment Analyzer
          </h1>
          <p className="text-text-secondary max-w-2xl">
            Analyze interview transcripts to extract sentiment insights and
            patterns. Upload your transcripts to get started.
          </p>

          {/* Placeholder content area */}
          <div className="mt-10 p-8 border border-border rounded-lg border-dashed">
            <p className="text-text-tertiary text-center">
              Upload functionality coming soon
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
