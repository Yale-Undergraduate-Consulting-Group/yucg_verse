"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
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
    }));
    if (uploaded.length) {
      setFiles(prev => [...prev, ...uploaded]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[var(--content-default)] px-6 py-10 sm:px-8 sm:py-12">
        {/* Page header — constrained */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Sentiment Analyzer
          </h1>
          <p className="mt-2 max-w-xl text-text-secondary">
            Upload interview transcripts to extract sentiment insights and patterns.
          </p>
        </header>

        {/* Instructions — compact, scannable */}
        <div className="mb-6 rounded-lg border border-border-subtle bg-background-alt px-4 py-3 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">Instructions:</span>{" "}
          Upload PDF transcripts exported from AI transcription tools (Otter.ai, Rev, Descript, etc.).
        </div>

        {/* Upload area — card, not full width */}
        <section className="mb-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed bg-background-alt transition-colors ${
              isDragging
                ? "border-accent bg-accent-muted-strong"
                : "border-border hover:border-text-tertiary/60"
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center justify-center py-10 px-6 sm:py-12">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isDragging ? "bg-accent-muted text-accent" : "bg-surface text-text-tertiary"}`}>
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-center text-sm font-medium text-text-primary">
                {isDragging ? "Drop files here" : "Drop PDF files here or click to browse"}
              </p>
              <p className="mt-1 text-center text-xs text-text-tertiary">
                PDF only
              </p>
            </div>
          </div>
        </section>

        {/* File list — card with max height, constrained */}
        {files.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => setFiles([])}
                className="text-sm text-text-tertiary hover:text-accent transition-colors"
              >
                Clear all
              </button>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-background-alt p-2 shadow-[var(--shadow-sm)]">
              {files.map(file => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover group"
                >
                  <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{file.name}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">{formatSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="shrink-0 rounded p-1.5 text-text-tertiary opacity-0 transition-all hover:bg-border hover:text-text-primary group-hover:opacity-100"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Run button — constrained width, prominent */}
        {files.length > 0 && (
          <div className="flex justify-start">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:opacity-70 disabled:pointer-events-none"
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
        )}
      </div>
    </div>
  );
}
