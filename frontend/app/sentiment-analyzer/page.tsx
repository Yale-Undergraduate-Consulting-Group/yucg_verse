"use client";

import { useCallback, useState } from "react";
import {
  ActionPanel,
  MainPanel,
  QueuePanel,
  SentimentHero,
  type AnalysisResult,
  type UploadedFile,
} from "@/app/components/sentiment-analyzer";
import { API_BASE_URL } from "../lib/constants";

export default function SentimentAnalyzerPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(
      (file) => file.type === "application/pdf" || file.name.endsWith(".pdf")
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

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file.file);
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
  }, [files]);

  const successful = results?.filter((result) => !result.error) ?? [];
  const positives = successful.filter(
    (result) => result.sentiment === "positive"
  ).length;
  const negatives = successful.filter(
    (result) => result.sentiment === "negative"
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <SentimentHero
        filesCount={files.length}
        positives={positives}
        negatives={negatives}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <MainPanel
          isDragging={isDragging}
          error={error}
          results={results}
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
          <ActionPanel
            isRunning={isRunning}
            disabled={isRunning || files.length === 0}
            onRun={handleRun}
          />
        </aside>
      </div>
    </div>
  );
}
