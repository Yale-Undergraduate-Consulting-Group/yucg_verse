interface SettingsPanelProps {
  maxLocations: number;
  x: number;
  onMaxLocationsChange: (n: number) => void;
  onXChange: (x: number) => void;
}

function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      <p className="mb-2 text-xs text-text-tertiary">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-6 text-center text-sm font-semibold text-text-primary">{value}</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-tertiary">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function SettingsPanel({
  maxLocations,
  x,
  onMaxLocationsChange,
  onXChange,
}: SettingsPanelProps) {
  return (
    <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-text-tertiary">
        Settings
      </h2>
      <div className="space-y-5">
        <SliderSetting
          label="Max Locations (N)"
          description="Maximum number of locations you can select on the map."
          value={maxLocations}
          min={1}
          max={20}
          onChange={onMaxLocationsChange}
        />
        <SliderSetting
          label="Top Reviews (x)"
          description="How many most positive and most negative reviews to highlight per location."
          value={x}
          min={1}
          max={30}
          onChange={onXChange}
        />
      </div>
    </div>
  );
}
