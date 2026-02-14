import { ToolGrid } from "./components/tools";
import { defaultTools } from "./lib/config";

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[var(--content-default)] px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-16 sm:mb-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Yale Undergraduate Consulting Group
            </p>
          </div>
          <h1 className="font-bold tracking-tight text-text-primary text-4xl sm:text-5xl sm:tracking-[-0.02em] [font-family:var(--font-plus-jakarta)]">
            Analytics
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-secondary">
            Internal tools for interview analysis, metrics, and insights.
          </p>
        </header>

        <section>
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-text-tertiary [font-family:var(--font-plus-jakarta)]">
            Tools
          </h2>
          <ToolGrid tools={defaultTools} />
        </section>
      </div>
    </div>
  );
}
