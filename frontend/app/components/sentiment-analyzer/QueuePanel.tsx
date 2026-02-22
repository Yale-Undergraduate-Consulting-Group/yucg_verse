import { FileText, X } from "lucide-react";
import type { UploadedFile } from "./types";
import { formatSize } from "./utils";

interface QueuePanelProps {
  files: UploadedFile[];
  onClearAll: () => void;
  onRemoveFile: (id: string) => void;
}

export default function QueuePanel({
  files,
  onClearAll,
  onRemoveFile,
}: QueuePanelProps) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Queue
        </h2>
        {files.length > 0 && (
          <button
            onClick={onClearAll}
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
                onClick={() => onRemoveFile(file.id)}
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
  );
}
