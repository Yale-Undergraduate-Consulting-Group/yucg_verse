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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    const uploaded: UploadedFile[] = pdfs.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      file: f,
    }));
    if (uploaded.length) {
      setFiles(prev => [...prev, ...uploaded]);
      setResults(null);
      setError(null);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[var(--content-default)] px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-6 bg-accent" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Tool
            </p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl sm:tracking-[-0.02em] [font-family:var(--font-plus-jakarta)]">
            Sentiment Analyzer
          </h1>
          <p className="mt-3 max-w-xl text-text-secondary">
            Upload interview transcripts to extract sentiment insights and patterns.
          </p>
        </header>

        <div className="mb-6 rounded-xl border border-[var(--border)] bg-background-alt px-4 py-3.5 text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Instructions:</span>{" "}
          Upload PDF transcripts exported from AI transcription tools (Otter.ai, Rev, Descript, etc.).
        </div>

        <section className="mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
              isDragging
                ? "border-accent bg-accent-muted-strong shadow-[0_0_0_1px_var(--accent-muted-strong),0_0_32px_var(--accent-glow)]"
                : "border-[var(--border)] bg-background-alt hover:border-text-tertiary/50"
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center justify-center py-12 px-6 sm:py-14">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200 ${
                  isDragging
                    ? "bg-accent-muted text-accent ring-2 ring-accent/30"
                    : "bg-surface text-text-tertiary"
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
        </section>

        {files.length > 0 && (
          <>
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-text-tertiary transition-colors hover:text-accent"
                >
                  Clear all
                </button>
              </div>
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-background-alt p-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="shrink-0 rounded-md p-1.5 text-text-tertiary opacity-0 transition-all hover:bg-surface-hover hover:text-text-primary group-hover:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex justify-start">
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] transition-all hover:bg-accent-hover hover:shadow-[0_0_24px_var(--accent-glow)] disabled:pointer-events-none disabled:opacity-60"
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
            </div>
          </>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {results && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Results</h2>
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--border)] bg-background-alt p-4"
                >
                  <h3 className="mb-3 font-medium text-text-primary">{result.filename}</h3>
                  {result.error ? (
                    <p className="text-sm text-red-400">{result.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-text-tertiary">Sentiment: </span>
                        <span
                          className={`font-medium ${
                            result.sentiment === "positive"
                              ? "text-green-400"
                              : result.sentiment === "negative"
                              ? "text-red-400"
                              : "text-text-secondary"
                          }`}
                        >
                          {result.sentiment}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Pages: </span>
                        <span className="text-text-primary">{result.page_count}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Words: </span>
                        <span className="text-text-primary">{result.word_count?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Positive words: </span>
                        <span className="text-text-primary">{result.positive_word_count}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Negative words: </span>
                        <span className="text-text-primary">{result.negative_word_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
