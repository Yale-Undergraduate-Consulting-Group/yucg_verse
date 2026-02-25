import UploadDropzone from "./UploadDropzone";

interface MainPanelProps {
  isDragging: boolean;
  error: string | null;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function MainPanel({
  isDragging,
  error,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: MainPanelProps) {
  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Instructions:</span>{" "}
        Upload transcript files (.docx or .txt) exported from AI transcription
        tools (Otter.ai, Rev, Descript, etc.). Name each file after the interviewee
        (e.g. <span className="font-mono">Erin_Yoon.docx</span>).
      </div>

      <UploadDropzone
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onFileSelect={onFileSelect}
      />

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}
