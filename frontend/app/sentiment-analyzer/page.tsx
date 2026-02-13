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
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Sentiment Analyzer
        </h1>
        <p className="text-text-secondary mt-1">
          Upload interview transcripts to extract sentiment insights and patterns.
        </p>
      </div>

      {/* Instructions */}
      <div className="mb-6 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">Instructions:</span>{" "}
        Upload PDF transcripts exported from AI transcription tools (Otter.ai, Rev, Descript, etc.)
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg transition-colors flex-shrink-0 ${
          isDragging
            ? "border-accent bg-accent-muted"
            : "border-border hover:border-text-tertiary"
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center py-8">
          <Upload className={`w-6 h-6 mb-2 ${isDragging ? "text-accent" : "text-text-tertiary"}`} />
          <p className="text-text-primary font-medium text-sm">
            {isDragging ? "Drop files here" : "Drop PDF files here or click to browse"}
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-text-tertiary hover:text-text-secondary"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-1 overflow-y-auto flex-1">
            {files.map(file => (
              <li
                key={file.id}
                className="flex items-center gap-3 py-2 px-3 bg-surface rounded group"
              >
                <FileText className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <span className="flex-1 text-sm text-text-primary truncate">{file.name}</span>
                <span className="text-xs text-text-tertiary">{formatSize(file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Run button */}
      {files.length > 0 && (
        <div className="mt-4 flex-shrink-0">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-70 transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              "Run Tool"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
