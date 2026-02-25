import { Upload } from "lucide-react";

interface UploadDropzoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadDropzone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: UploadDropzoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? "border-accent bg-accent-muted/60 shadow-[0_0_0_1px_var(--accent-muted-strong),0_0_24px_var(--accent-glow)]"
          : "border-[var(--border)] bg-white/70 hover:border-text-tertiary/50"
      }`}
    >
      <input
        type="file"
        accept=".docx,.txt"
        multiple
        onChange={onFileSelect}
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
          {isDragging ? "Drop files here" : "Drop transcript files here or click to browse"}
        </p>
        <p className="mt-1 text-center text-xs text-text-tertiary">.docx and .txt only</p>
      </div>
    </div>
  );
}
