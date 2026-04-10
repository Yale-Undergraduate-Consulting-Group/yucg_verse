interface SettingsPanelProps {
  n: number;
  onNChange: (n: number) => void;
}

export default function SettingsPanel({ n, onNChange }: SettingsPanelProps) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Settings
      </h2>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Top N Reviews
        </label>
        <p className="mb-2 text-xs text-text-tertiary">
          Number of most positive and most negative reviews to highlight per location.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={5}
            value={n}
            onChange={(e) => onNChange(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="w-6 text-center text-sm font-semibold text-text-primary">{n}</span>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-text-tertiary">
          <span>1</span>
          <span>5</span>
        </div>
      </div>
    </div>
  );
}
