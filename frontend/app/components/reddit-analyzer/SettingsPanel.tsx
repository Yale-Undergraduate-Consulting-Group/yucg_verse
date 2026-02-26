import { Settings } from "lucide-react";

interface SettingsPanelProps {
  timeFilter: string;
  limit: string;
  onTimeFilterChange: (value: string) => void;
  onLimitChange: (value: string) => void;
}

const TIME_FILTER_OPTIONS = [
  { value: "hour", label: "Past Hour" },
  { value: "day", label: "Past 24 Hours" },
  { value: "week", label: "Past Week" },
  { value: "month", label: "Past Month" },
  { value: "year", label: "Past Year" },
  { value: "all", label: "All Time" },
];

export default function SettingsPanel({
  timeFilter,
  limit,
  onTimeFilterChange,
  onLimitChange,
}: SettingsPanelProps) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        <Settings className="h-4 w-4" />
        Settings
      </h2>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="timeFilter"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Time Range
          </label>
          <select
            id="timeFilter"
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white/80 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            {TIME_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="limit"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Max Posts (optional)
          </label>
          <input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => onLimitChange(e.target.value)}
            placeholder="No limit"
            min="1"
            max="1000"
            className="w-full rounded-lg border border-[var(--border)] bg-white/80 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      </div>
    </div>
  );
}
