interface ToolHeroProps {
  label: string;
  title: string;
  description: string;
  comingSoon?: boolean;
}

export default function ToolHero({
  label,
  title,
  description,
  comingSoon,
}: ToolHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[linear-gradient(120deg,#1d4ed8_0%,#2563eb_42%,#0ea5e9_100%)] p-7 text-white sm:p-8">
      <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-white/12 blur-2xl" />
      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            {label}
          </p>
          {comingSoon && (
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
              Coming Soon
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl [font-family:var(--font-plus-jakarta)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-white/85 sm:text-base">{description}</p>
        
      </div>
    </section>
  );
}
