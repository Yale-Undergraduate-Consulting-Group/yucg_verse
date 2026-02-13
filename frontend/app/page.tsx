import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

const tools = [
  {
    name: "Sentiment Analyzer",
    description: "Analyze interview transcripts to extract sentiment insights and patterns.",
    href: "/sentiment-analyzer",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[var(--content-default)] px-6 py-10 sm:px-8 sm:py-12">
        {/* Hero / Header — constrained, left-aligned */}
        <header className="mb-12 sm:mb-16">
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">
            Yale Undergraduate Consulting Group
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">
            Internal tools for interview analysis, metrics, and insights.
          </p>
        </header>

        {/* Tools — card grid, not full width */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-4">
            Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-1 sm:max-w-xl">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-start gap-4 rounded-xl border border-border bg-background-alt p-5 shadow-[var(--shadow-sm)] transition-all hover:border-accent/40 hover:shadow-[var(--shadow-md)] hover:bg-surface"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-muted-strong text-accent transition-colors group-hover:bg-accent-muted">
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary transition-colors group-hover:text-accent">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {tool.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </section>

        {/* Optional: subtle footer line for balance */}
        <footer className="mt-16 pt-8 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary">
            Internal use only · YUCG
          </p>
        </footer>
      </div>
    </div>
  );
}
