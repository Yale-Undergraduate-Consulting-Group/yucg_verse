"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../lib/constants";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface AnalysisResult {
  filename: string;
  page_count?: number;
  word_count?: number;
  char_count?: number;
  sentiment?: string;
  positive_word_count?: number;
  negative_word_count?: number;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SentimentAnalyzerPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    []
  );

  const addFiles = (newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    const uploaded: UploadedFile[] = pdfs.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      file: f,
    }));
    if (uploaded.length) {
      setFiles((prev) => [...prev, ...uploaded]);
      setResults(null);
      setError(null);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append("files", f.file);
      });

      const response = await fetch(`${API_BASE_URL}/api/analyze_sentiment`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  };

  const successful = results?.filter((result) => !result.error) ?? [];
  const positives = successful.filter((result) => result.sentiment === "positive").length;
  const negatives = successful.filter((result) => result.sentiment === "negative").length;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[linear-gradient(120deg,#1d4ed8_0%,#2563eb_42%,#0ea5e9_100%)] p-7 text-white sm:p-8">
        <div className="absolute right-12 top-4 h-20 w-20 rounded-full border border-white/20" />
        <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-white/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Transcript Tool
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl [font-family:var(--font-plus-jakarta)]">
              Sentiment Analyzer
            </h1>
            <p className="mt-2 text-sm text-white/85 sm:text-base">
              Upload PDF interview transcripts and generate sentiment metrics in
              a single run.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Files</p>
              <p className="mt-0.5 text-lg font-semibold">{files.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Positive</p>
              <p className="mt-0.5 text-lg font-semibold">{positives}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Negative</p>
              <p className="mt-0.5 text-lg font-semibold">{negatives}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
          <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Instructions:</span>{" "}
            Upload PDF transcripts exported from AI transcription tools
            (Otter.ai, Rev, Descript, etc.).
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
              isDragging
                ? "border-accent bg-accent-muted/60 shadow-[0_0_0_1px_var(--accent-muted-strong),0_0_24px_var(--accent-glow)]"
                : "border-[var(--border)] bg-white/70 hover:border-text-tertiary/50"
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center justify-center px-6 py-11 sm:py-14">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200 ${
                  isDragging
                    ? "bg-accent-muted text-accent ring-2 ring-accent/30"
                    : "bg-[var(--surface)] text-text-tertiary"
                }`}
              >
                <Upload className="h-7 w-7" />
              </div>
              <p className="text-center font-medium text-text-primary">
                {isDragging ? "Drop files here" : "Drop PDF files here or click to browse"}
              </p>
              <p className="mt-1 text-center text-xs text-text-tertiary">PDF only</p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {results && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Results
              </h2>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
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
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Queue
              </h2>
              {files.length > 0 && (
                <button
                  onClick={() => setFiles([])}
                  className="text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary"
                >
                  Clear all
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-white/60 px-4 py-6 text-center text-sm text-text-tertiary">
                No files selected yet.
              </p>
            ) : (
              <ul className="max-h-[340px] space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-white/70 p-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--surface)]"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-text-tertiary">
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="shrink-0 rounded-md p-1 text-text-tertiary opacity-0 transition-all hover:bg-white hover:text-text-primary group-hover:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Action
            </h2>
            <button
              onClick={handleRun}
              disabled={isRunning || files.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run analysis"
              )}
            </button>
            <p className="mt-2 text-xs text-text-tertiary">
              Processing starts once at least one PDF is added.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
