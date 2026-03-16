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

  // ── New: company name state ──────────────────────────────────────────────
  const [company, setCompany] = useState<string>("Canva");

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (file) => file.name.endsWith(".docx") || file.name.endsWith(".txt")
    );
    const uploaded: UploadedFile[] = pdfs.map((file) => ({
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

      // ── Pass the company name to the backend as a form field ────────────
      formData.append("company", company.trim() || "Canva");

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
  }, [files, company]);

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

          {/* ── Company name input ────────────────────────────────────── */}
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
              Sentences mentioning this company will be analysed separately from
              competitor mentions.
            </p>
          </div>

          <ActionPanel
            isRunning={isRunning}
            disabled={isRunning || files.length === 0}
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
            company={company.trim() || "Canva"}
          />
        </section>
      )}
    </div>
  );
}