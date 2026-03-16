"use client";

import { useCallback, useState } from "react";
import {
  ActionPanel,
  MainPanel,
  QueuePanel,
  ResultsPanel,
  type AnalysisResult,
  type UploadedFile,
  type TopWord,
} from "@/app/components/sentiment-analyzer";
import ToolHero from "@/app/components/ToolHero";
import { API_BASE_URL } from "../lib/constants";

export default function SentimentAnalyzerPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [overallPlot, setOverallPlot] = useState<string | null>(null);
  const [wordStats, setWordStats] = useState<TopWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Target company entered by the user — used to filter and label the analysis
  const [company, setCompany] = useState<string>("");

  // Comma-separated list of competitor/other services entered by the user.
  // Stage 04 uses this to separate competitor sentences from target-company
  // sentences. Leave blank to skip competitor separation.
  const [otherServices, setOtherServices] = useState<string>("");

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(
      (file) => file.name.endsWith(".docx") || file.name.endsWith(".txt")
    );
    const uploaded: UploadedFile[] = valid.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      file,
    }));
    if (uploaded.length) {
      setFiles((prev) => [...prev, ...uploaded]);
      setResults(null);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        addFiles(Array.from(event.target.files));
        event.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    setOverallPlot(null);
    setWordStats(null);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file.file);
      });

      // Send the target company name — required by the backend
      formData.append("company", company.trim());

      // Send the competitor list as a comma-separated string.
      // The backend parses this into a list. Empty string is valid —
      // it means no competitor separation will be performed.
      formData.append("other_services", otherServices.trim());

      const response = await fetch(`${API_BASE_URL}/api/analyze_transcripts`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results);
      setOverallPlot(data.overall_plot ?? null);
      setWordStats(data.word_stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [files, company, otherServices]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <ToolHero
        label="Transcript Tool"
        title="Sentiment Analyzer"
        description="Upload interview transcripts and generate sentiment metrics in a single run."
        comingSoon
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <MainPanel
          isDragging={isDragging}
          error={error}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />

        <aside className="space-y-4">
          <QueuePanel
            files={files}
            onClearAll={clearFiles}
            onRemoveFile={removeFile}
          />

          {/* ── Target Company input ──────────────────────────────────── */}
          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Target Company
            </h2>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Canva, Figma, Adobe…"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-white/80 px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <p className="mt-2 text-xs text-text-tertiary">
              Sentences mentioning this company are analyzed for word-sentiment
              associations.
            </p>
          </div>

          {/* ── Competitor Services input ─────────────────────────────── */}
          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Competitor Services
            </h2>
            <input
              type="text"
              value={otherServices}
              onChange={(e) => setOtherServices(e.target.value)}
              placeholder="e.g. figma, adobe, sketch…"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-white/80 px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <p className="mt-2 text-xs text-text-tertiary">
              Comma-separated. Sentences mentioning these are separated out so
              competitor comparisons don&apos;t skew the target company analysis.
              Leave blank to skip this separation.
            </p>
          </div>

          <ActionPanel
            isRunning={isRunning}
            disabled={isRunning || files.length === 0 || !company.trim()}
            onRun={handleRun}
            comingSoon
          />
        </aside>
      </div>

      {results && (
        <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
          <ResultsPanel
            results={results}
            overallPlot={overallPlot}
            wordStats={wordStats}
            company={company.trim()}
          />
        </section>
      )}
    </div>
  );
}