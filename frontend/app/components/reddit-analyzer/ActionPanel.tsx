import { Loader2 } from "lucide-react";

interface ActionPanelProps {
  isRunning: boolean;
  disabled: boolean;
  onRun: () => void;
}

export default function ActionPanel({
  isRunning,
  disabled,
  onRun,
}: ActionPanelProps) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Action
      </h2>
      <button
        onClick={onRun}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          "Analyze Reddit"
        )}
      </button>
      <p className="mt-2 text-xs text-text-tertiary">
        Enter a subreddit and search query to begin analysis.
      </p>
    </div>
  );
}
