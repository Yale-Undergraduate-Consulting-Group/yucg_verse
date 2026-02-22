export default function HomeHero() {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[linear-gradient(120deg,#1e40af_0%,#1d4ed8_35%,#2563eb_100%)] p-7 text-white shadow-[var(--shadow-md)] sm:p-9">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 right-10 h-20 w-20 rounded-full bg-white/20 blur-xl" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          Analytics Workspace
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl [font-family:var(--font-plus-jakarta)]">
          Welcome to YUCG Analytics
        </h1>
        <p className="mt-3 text-sm text-white/85 sm:text-base">
          A platform for technical analysis to support YUCG&apos;s internal operations and
          project capabilities.
        </p>
      </div>
    </header>
  );
}
