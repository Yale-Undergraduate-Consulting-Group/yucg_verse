"use client";

import { useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { Upload, X, FileText, Loader2 } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SentimentAnalyzerPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    const uploaded: UploadedFile[] = pdfFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      size: file.size,
    }));
    if (uploaded.length > 0) {
      setFiles(prev => [...prev, ...uploaded]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-60">
        {/* Header bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-border">
          <span className="text-text-primary font-medium">
            Sentiment Analyzer
          </span>
          {files.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                `Analyze ${files.length} file${files.length > 1 ? "s" : ""}`
              )}
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="p-10 max-w-3xl">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Interview Sentiment Analyzer
          </h1>
          <p className="text-text-secondary mb-8">
            Upload interview transcripts to extract sentiment insights and patterns.
          </p>

          {/* Upload area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
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
            <div className="flex flex-col items-center py-12 px-6">
              <Upload className={`w-8 h-8 mb-3 ${isDragging ? "text-accent" : "text-text-tertiary"}`} />
              <p className="text-text-primary font-medium mb-1">
                {isDragging ? "Drop files here" : "Drop PDF files here"}
              </p>
              <p className="text-sm text-text-tertiary">
                or click to browse
              </p>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-2">
                {files.map(file => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 py-2 px-3 bg-surface rounded-md group"
                  >
                    <FileText className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    <span className="flex-1 text-sm text-text-primary truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-10 pt-8 border-t border-border">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-4">
              Instructions
            </h2>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Upload PDF transcripts exported from AI transcription tools (Otter.ai, Rev, Descript, etc.)</li>
              <li>Files must be in PDF format</li>
              <li>Each file should contain a single interview transcript</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
